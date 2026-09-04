
import { supabase, dbSuppliers, dbBranches, dbInventory, dbCentralInventory, dbCapital } from '../db.js';

window.supabase = supabase;

window.openCentralItemModal = async function() {
    const [suppliers, capitalAccounts] = await Promise.all([
        dbSuppliers.fetchAll(state.ownerId).catch(() => []),
        dbCapital.fetchAccounts(state.ownerId).catch(() => [])
    ]);
    const supplierOptions = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    const capitalOptions = capitalAccounts.map(c => `<option value="${c.id}">${c.account_name} (Bal: TZS ${window.fmt ? window.fmt.number(c.balance || 0) : c.balance})</option>`).join('');

    const modalHtml = `
        <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
            <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                <i data-lucide="chevron-left" class="w-4 h-4"></i><span>${window.t('back', 'Back')}</span>
            </button>
            <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <i data-lucide="package-plus" class="w-4 h-4"></i>
                </div>
                <h3 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white">${window.t('add_stock_item', 'Add Stock Item')}</h3>
            </div>
            <button type="button" onclick="window.askStockAssistant()" class="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#475B6E]/10 hover:bg-[#475B6E]/20 text-[#475B6E] font-bold rounded-xl text-xs transition-all border border-[#475B6E]/20 shadow-xs">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-[#475B6E]"></i> ${window.t('ask_assistant', 'Ask')}
            </button>
        </div>
        <form onsubmit="window.saveCentralItem(event)" class="flex flex-col flex-1 overflow-hidden">
            <div class="flex-1 overflow-y-auto p-6 space-y-6">
                <!-- Bulk Import Option -->
                <div class="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h4 class="text-sm font-bold text-indigo-900 flex items-center gap-2">
                            <i data-lucide="sparkles" class="w-4 h-4"></i> ${window.t('import_csv', 'Bulk Add Items')}
                        </h4>
                        <p class="text-xs text-indigo-700 mt-1">Got many items? Upload your CSV or Excel (.xlsx / .xls) spreadsheet all at once.</p>
                    </div>
                    <div class="flex gap-2 w-full sm:w-auto">
                        <button type="button" onclick="window.downloadCentralCSVTemplate()" class="flex-1 sm:flex-none px-3 py-2 bg-white text-indigo-600 font-bold text-xs rounded-xl border border-indigo-200 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1.5">
                            <i data-lucide="download" class="w-3.5 h-3.5"></i> Template
                        </button>
                        <button type="button" onclick="window.importCentralCSV(); closeModal()" class="flex-1 sm:flex-none px-3 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 shadow-sm transition-colors flex items-center justify-center gap-1.5">
                            <i data-lucide="upload" class="w-3.5 h-3.5"></i> Upload File
                        </button>
                    </div>
                </div>

                <!-- Basic Details -->
                <div>
                    <h4 class="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">${window.t('basic_financial_details', 'Basic & Financial Details')}</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('item_name', 'Item Name')} *</label>
                            <input type="text" id="ciName" required placeholder="${window.t('eg_item', 'e.g. Brake Pads')}" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('sku_code', 'SKU / Code')}</label>
                            <div class="flex gap-2">
                                <input type="text" id="ciSku" placeholder="Auto-generated if blank" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                                <button type="button" onclick="window.autoFillSKU('ciCategory', 'ciName', 'ciSku')" class="px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-xl text-xs flex items-center gap-1 shrink-0 border border-indigo-200 transition-colors" title="Auto-generate Barcode SKU">
                                    <i data-lucide="wand-2" class="w-4 h-4"></i> Auto
                                </button>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('category', 'Category')} *</label>
                            <input type="text" id="ciCategory" required class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('initial_stock', 'Initial Main Store Stock')} *</label>
                            <input type="text" inputmode="decimal" id="ciMainStoreStock" placeholder="e.g. 1,000" required oninput="window.calcCentralFinancials()" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-indigo-600 number-format">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('purchase_price', 'Purchase Price per Item (Cost)')} *</label>
                            <input type="text" inputmode="decimal" id="ciCostPrice" required placeholder="e.g. 20,000" oninput="window.calcCentralFinancials()" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-amber-600 number-format">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('selling_prices', 'Selling Prices')} *</label>
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <span class="block text-[9px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">${window.t('wholesale', 'Wholesale')}</span>
                                    <input type="text" inputmode="decimal" id="ciWholesalePrice" required placeholder="e.g. 28,000" oninput="window.calcCentralFinancials()" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600 number-format">
                                </div>
                                <div>
                                    <span class="block text-[9px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">${window.t('retail', 'Retail')}</span>
                                    <input type="text" inputmode="decimal" id="ciRetailPrice" required placeholder="e.g. 30,000" oninput="window.calcCentralFinancials()" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-emerald-600 number-format">
                                </div>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('low_stock_threshold', 'Low Stock Threshold')}</label>
                            <input type="text" inputmode="decimal" id="ciThreshold" placeholder="5" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all number-format">
                        </div>
                    </div>
                </div>

                <!-- Financial Calculation Preview Box -->
                <div class="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-1.5">
                    <h5 class="text-[11px] font-black uppercase tracking-wider text-[#475B6E] mb-1.5">${window.t('financial_return_calc', 'Financial Return Calculation')}</h5>
                    <div class="space-y-1.5">
                        <div class="bg-white px-3 py-1.5 rounded-xl border border-slate-200/70 shadow-xs flex items-center justify-between gap-4">
                            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-tight">${window.t('total_cost', 'Total Cost')}</p>
                            <p id="calcTotalCost" class="text-xs sm:text-sm font-black text-amber-600 whitespace-nowrap">TZS 0</p>
                        </div>
                        <div class="bg-white px-3 py-1.5 rounded-xl border border-slate-200/70 shadow-xs flex items-center justify-between gap-4">
                            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-tight">${window.t('expected_sales_return', 'Expected Sales Value')}</p>
                            <p id="calcExpectedSales" class="text-xs sm:text-sm font-black text-emerald-600 whitespace-nowrap">TZS 0</p>
                        </div>
                        <div class="bg-white px-3 py-1.5 rounded-xl border border-slate-200/70 shadow-xs flex items-center justify-between gap-4">
                            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-tight">${window.t('potential_profit', 'Potential Gross Profit')}</p>
                            <p id="calcPotentialProfit" class="text-xs sm:text-sm font-black text-[#475B6E] whitespace-nowrap">TZS 0</p>
                        </div>
                    </div>
                </div>

                <!-- Supplier & Funding Capital Source -->
                <div>
                    <h4 class="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">${window.t('supplier_details', 'Supplier & Funding Source')}</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${window.t('supplier', 'Supplier')}</label>
                            ${window.renderPremiumSelect ? window.renderPremiumSelect({
                                id: 'ciSupplier',
                                selectedValue: '',
                                searchable: suppliers.length > 4,
                                options: [
                                    { value: '', label: window.t('no_supplier', '-- No Supplier --'), icon: 'minus-circle' },
                                    ...suppliers.map(s => ({ value: s.id, label: s.name, icon: 'truck' }))
                                ]
                            }) : ''}
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Funding Capital Source (Deduction)</label>
                            ${window.renderPremiumSelect ? window.renderPremiumSelect({
                                id: 'ciCapitalSource',
                                selectedValue: '',
                                searchable: capitalAccounts.length > 4,
                                options: [
                                    { value: '', label: 'Unlinked (No Capital Deduction)', icon: 'minus-circle' },
                                    ...capitalAccounts.map(c => ({ value: c.id, label: `${c.account_name} (${window.fmt.currency(c.balance || 0)})`, icon: 'wallet' }))
                                ]
                            }) : ''}
                        </div>
                    </div>
                    <div class="mt-3">
                        <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('description', 'Description')}</label>
                        <textarea id="ciDescription" rows="2" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"></textarea>
                    </div>
                </div>
            </div>
            <div class="p-3 sm:p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-2.5 sm:gap-4 bg-gray-50/80 dark:bg-gray-900/80 mt-auto flex-shrink-0">
                <button type="button" onclick="closeModal()" class="px-3.5 py-1.5 sm:px-6 sm:py-2.5 font-bold rounded-xl transition-all text-xs sm:text-sm bg-red-600 text-white hover:bg-red-700 shadow-sm border-none min-w-[85px] sm:min-w-[140px] flex items-center justify-center">${window.t('cancel', 'Cancel')}</button>
                <button type="submit" class="px-3.5 py-1.5 sm:px-6 sm:py-2.5 bg-[#475B6E] text-white font-bold rounded-xl hover:bg-[#394a5a] shadow-md transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 min-w-[110px] sm:min-w-[180px]">
                    <i data-lucide="plus" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> ${window.t('save_item', 'Save Stock Item')}
                </button>
            </div>
        </form>
    `;

    openModal(modalHtml);
};

window.closeCentralItemModal = function() {
    closeModal();
};

window.askStockAssistant = function() {
    if (window.openAiWithContext) {
        window.openAiWithContext('restock');
    } else if (window.openAiWithQuestion) {
        window.openAiWithQuestion("How do I add central stock, calculate purchase cost, selling price, and dispatch to branches?");
    } else if (window.toggleAiChat) {
        document.body.classList.add('ai-modal-context-active');
        window.toggleAiChat();
    }
};

window.calcCentralFinancials = function() {
    const qty = window.fmt.parseNumber(document.getElementById('ciMainStoreStock')?.value || 0);
    const cost = window.fmt.parseNumber(document.getElementById('ciCostPrice')?.value || 0);
    const price = window.fmt.parseNumber(document.getElementById('ciRetailPrice')?.value || 0);

    const totalCost = qty * cost;
    const expectedSales = qty * price;
    const profit = expectedSales - totalCost;

    if (document.getElementById('calcTotalCost')) document.getElementById('calcTotalCost').textContent = window.fmt.currency(totalCost);
    if (document.getElementById('calcExpectedSales')) document.getElementById('calcExpectedSales').textContent = window.fmt.currency(expectedSales);
    if (document.getElementById('calcPotentialProfit')) document.getElementById('calcPotentialProfit').textContent = window.fmt.currency(profit);
};

window.saveCentralItem = async function(e) {
    e.preventDefault();

    const costPrice = window.fmt.parseNumber(document.getElementById('ciCostPrice')?.value || 0);
    const retailPrice = window.fmt.parseNumber(document.getElementById('ciRetailPrice')?.value || 0);
    const wholesalePrice = window.fmt.parseNumber(document.getElementById('ciWholesalePrice')?.value || 0);
    const mainStoreStockInput = document.getElementById('ciMainStoreStock')?.value;
    const mainStoreStock = mainStoreStockInput ? window.fmt.parseNumber(mainStoreStockInput) : 0;
    const thresholdInput = document.getElementById('ciThreshold')?.value;
    const minThreshold = thresholdInput ? window.fmt.parseNumber(thresholdInput) : 5;

    const name = document.getElementById('ciName').value;
    const category = document.getElementById('ciCategory').value;
    const sku = document.getElementById('ciSku').value?.trim() || window.generateAutoSKU(category, name);

    const centralPayload = {
        owner_id: state.ownerId,
        name: name,
        sku: sku,
        category: category,
        cost_price: costPrice,
        price: retailPrice, // default fallback price
        retail_price: retailPrice,
        wholesale_price: wholesalePrice,
        min_threshold: minThreshold,
        main_store_stock: mainStoreStock,
        supplier_id: document.getElementById('ciSupplier').value || null,
        description: document.getElementById('ciDescription').value || null
    };

    try {
        window.showLoader('Registering stock item in Central Inventory...');

        const centralItem = await dbCentralInventory.add(centralPayload);

        // Automatically assign catalog item to all active branches
        const branches = await dbBranches.fetchAll(state.ownerId);
        const branchPayload = {
            name: centralItem.name,
            sku: centralItem.sku,
            category: centralItem.category,
            cost_price: costPrice,
            price: retailPrice, // default fallback price
            retail_price: retailPrice,
            wholesale_price: wholesalePrice,
            min_threshold: centralItem.min_threshold,
            quantity: 0,
            central_item_id: centralItem.id,
            is_from_main_store: true
        };

        if (branches && branches.length > 0) {
            await Promise.all(branches.map(b => dbInventory.add(b.id, branchPayload)));
        }

        const capitalAccountId = document.getElementById('ciCapitalSource')?.value;
        const totalPurchaseValuation = mainStoreStock * costPrice;
        if (capitalAccountId && totalPurchaseValuation > 0) {
            await dbCapital.adjustBalance(capitalAccountId, -totalPurchaseValuation, {
                notes: `Central Inventory Stock Purchase: ${name} (${mainStoreStock} units @ TZS ${costPrice})`
            });
        }

        window.hideLoader();
        window.closeCentralItemModal();
        window.showToast('Stock item registered successfully in Central Inventory!', 'success');
        if (window.renderOwnerInventoryModule) window.renderOwnerInventoryModule();
    } catch (err) {
        window.hideLoader();
        window.showToast('Failed to add stock item: ' + err.message, 'error');
    }
};

window.notifyBranchStock = async function (branchId, itemName, branchName) {
    const ok = await confirmModal('Notify Branch', `Send a stock alert task to ${branchName} for "${itemName}"?`, 'Send Alert', 'Cancel', 'bg-orange-500 hover:bg-orange-600');
    if (!ok) return;
    try {
        const { error } = await supabaseClient.from('tasks').insert({
            branch_id: branchId,
            owner_id: state.ownerId,
            title: `Restock Required: ${itemName}`,
            description: `Stock level is critically low for "${itemName}". Please request a restock via the Purchase Orders or Stock Transfers module.`,
            priority: 'urgent',
            status: 'pending'
        });
        if (error) throw error;
        showToast(`Alert sent to ${branchName}!`, 'success');
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

export async function renderOwnerInventoryModule() {
    if (sessionStorage.getItem('bms_central_subview') === 'dispatch_hub' || state.activeView === 'central_dispatch') {
        const savedBranch = sessionStorage.getItem('bms_central_dispatch_branch') || null;
        return window.openCentralDispatchView(savedBranch);
    }

    const container = document.getElementById('mainContent');

    // 1. Mount Outer Shell ONCE
    let shell = document.getElementById('centralInventoryShell');
    if (!shell) {
        // Close any open premium dropdowns that were portalled to body before mounting shell
        document.querySelectorAll('.dropdown-premium-list').forEach(el => {
            el.classList.add('hidden');
            if (el.parentNode === document.body) document.body.removeChild(el);
        });
        container.innerHTML = `
        <div class="space-y-4 slide-in" id="centralInventoryShell">
            <!-- Header: Title & Add Stock Action -->
            <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center shrink-0">
                        <i data-lucide="package" class="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400"></i>
                    </div>
                    <div class="min-w-0">
                        <h2 class="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-tight truncate">${window.t('main_store_title', 'Main Store Central Inventory')}</h2>
                        <p class="text-xs text-gray-500 dark:text-gray-400 font-medium" id="centralCatalogCount">Loading catalogs...</p>
                    </div>
                </div>
                <button onclick="window.openCentralItemModal()" data-tooltip="Register new catalog item with cost, retail, wholesale, and initial main store stock" data-tooltip-title="Add New Stock" data-tooltip-variant="indigo" data-tooltip-position="bottom" class="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all text-xs whitespace-nowrap shrink-0 cursor-pointer shadow-xs">
                    <i data-lucide="plus" class="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"></i>
                    <span>${window.t('purchase_add_stock', 'Add Stock')}</span>
                </button>
            </div>

            <!-- Action Quick-Links (Stock Sheets, Central Dispatch, Bulk CSV Import) without scroll -->
            <div class="grid grid-cols-3 gap-2 sm:gap-3">
                <button onclick="openStocktakingModal()" data-tooltip="Generate printable A4 Stocktaking sheets (Blind Count or Standard Audit)" data-tooltip-title="Stock Sheets & Audit" data-tooltip-variant="indigo" data-tooltip-position="bottom" class="flex items-center justify-center gap-1.5 px-2 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 shadow-xs transition-all text-[11px] sm:text-xs text-center cursor-pointer min-w-0">
                    <i data-lucide="clipboard-list" class="w-3.5 h-3.5 text-indigo-600 shrink-0"></i>
                    <span class="truncate">${window.t('stock_sheets', 'Stock Sheets')}</span>
                </button>
                <button onclick="switchView('central_dispatch')" data-tooltip="Dispatch inventory shipments from headquarters to destination branch locations" data-tooltip-title="Central Dispatch" data-tooltip-variant="emerald" data-tooltip-position="bottom" class="flex items-center justify-center gap-1.5 px-2 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all text-[11px] sm:text-xs text-center cursor-pointer min-w-0">
                    <i data-lucide="truck" class="w-3.5 h-3.5 shrink-0"></i>
                    <span class="truncate">${window.t('nav_central_dispatch', 'Central Dispatch')}</span>
                </button>
                <button onclick="openModal('importCentralInventoryInfo')" data-tooltip="Import stock items in bulk using CSV or Excel (.xlsx) spreadsheets" data-tooltip-title="Bulk CSV Import" data-tooltip-position="bottom" class="flex items-center justify-center gap-1.5 px-2 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 shadow-xs transition-all text-[11px] sm:text-xs text-center cursor-pointer min-w-0">
                    <i data-lucide="upload" class="w-3.5 h-3.5 shrink-0"></i>
                    <span class="truncate">${window.t('import_csv', 'Import CSV')}</span>
                </button>
            </div>

            <!-- Financial Summary Cards -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 pt-2 sm:pt-2.5" id="centralInventoryStatsGrid">
                ${[1, 2, 3, 4].map(() => `<div class="relative bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 animate-pulse h-20"></div>`).join('')}
            </div>

            <!-- Sticky Fixed Bulk Actions Toolbar (Below Top Nav, Above Table) -->
            <div id="centralBulkActionsBar" class="hidden sticky top-0 z-40 flex items-center justify-between gap-3 p-3.5 bg-red-600 dark:bg-red-700 text-white shadow-xl rounded-2xl transition-all border border-red-700 dark:border-red-800">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold shrink-0">
                        <i data-lucide="check-square" class="w-4 h-4"></i>
                    </div>
                    <div>
                        <p id="centralSelectedCountText" class="text-xs sm:text-sm font-black text-white">0 items selected</p>
                        <p class="text-[11px] text-red-100 font-medium">Selected items will be deleted from Central Inventory and linked branch stocks.</p>
                    </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <button type="button" onclick="window.clearCentralSelection()" class="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer">
                        Cancel
                    </button>
                    <button type="button" onclick="window.deleteSelectedCentralItems()" class="px-4 py-1.5 bg-white text-red-600 hover:bg-red-50 font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        <span>Delete Selected</span>
                    </button>
                </div>
            </div>

            <!-- Clean Transparent Sticky Search Bar & Stock Filter Header (Desktop/Tablet Only) -->
            <div class="hidden sm:flex sticky top-0 z-30 pt-0.5 pb-1 sm:pt-1 sm:pb-1.5 mb-2 justify-center">
                <div class="flex flex-wrap sm:flex-nowrap items-center justify-center gap-2.5 max-w-lg w-full mx-auto">
                    <div class="flex-1 relative min-w-[160px] sm:max-w-xs">
                        <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400"></i>
                        <input type="text" id="invSearchInput" placeholder="Search main store..." value="${window.state._invSearch || ''}"
                            class="w-full pl-11 pr-4 py-2 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 font-medium text-gray-900 dark:text-white rounded-full text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            style="padding-left: 2.85rem !important;"
                            oninput="window.filterCentralInventoryList(null, this.value)">
                    </div>
                    <div class="w-full sm:w-48 shrink-0">
                        ${window.renderPremiumSelect({
                            id: 'invStatusFilter',
                            selectedValue: window.state._invStatusFilter || 'all',
                            searchable: false,
                            classes: 'w-full text-xs sm:text-sm rounded-full border-2 border-gray-300 dark:border-gray-600 font-medium text-gray-900 dark:text-white',
                            options: [
                                { value: 'all', label: 'All Stock Status', icon: 'filter' },
                                { value: 'low', label: 'Low Global Stock', icon: 'alert-triangle' },
                                { value: 'out', label: 'Out of Global Stock', icon: 'x-circle' }
                            ]
                        })}
                    </div>
                </div>
            </div>

            <!-- Mobile Central Inventory Action & Quick Shortcuts -->
            <div class="sm:hidden space-y-3">
                <!-- Primary Inventory View Capsule -->
                <div class="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
                    <button onclick="window.showCentralInventoryModal('all')" class="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-black rounded-full text-xs border border-indigo-100/60 dark:border-indigo-950/60 shadow-xs active:scale-[0.98] transition-all cursor-pointer">
                        <i data-lucide="package" class="w-4 h-4"></i>
                        <span>${window.t('click_see_central_inventory', 'Click to See Central Inventory')}</span>
                    </button>
                </div>

                <!-- 1. Quickly Dispatch Button -->
                <button onclick="window.openCentralDispatchView()" class="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl shadow-sm active:scale-[0.98] transition-all cursor-pointer">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                            <i data-lucide="truck" class="w-4.5 h-4.5"></i>
                        </div>
                        <div class="text-left">
                            <p class="text-xs font-black tracking-wide leading-tight">${window.t('quickly_dispatch', 'Quickly Dispatch')}</p>
                            <p class="text-[10px] text-emerald-100 font-medium">Send stock to destination branches</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 text-[11px] font-bold text-white bg-white/20 px-2.5 py-1 rounded-lg shrink-0">
                        <span>Dispatch</span>
                        <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                    </div>
                </button>

                <!-- 2, 3, 4: Low Stock, Healthy Stock, Performing Stock Shortcuts -->
                <div class="grid grid-cols-3 gap-2 sm:gap-2.5">
                    <!-- 2. Low Stock Count Shortcut -->
                    <div onclick="window.showCentralInventoryModal('low_stock')" class="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-rose-100 dark:border-rose-950/40 shadow-xs cursor-pointer active:scale-95 transition-all flex flex-col justify-between stat-card">
                        <div class="flex items-center justify-between gap-1 mb-1">
                            <span class="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                            <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-rose-500"></i>
                        </div>
                        <p class="text-[9.5px] font-bold uppercase tracking-tight text-gray-500 dark:text-gray-400">Low Stock</p>
                        <p id="mobileLowStockCount" class="text-sm font-black text-rose-600 dark:text-rose-400 leading-tight mt-0.5">0</p>
                    </div>

                    <!-- 3. Healthy Stock Count Shortcut -->
                    <div onclick="window.showCentralInventoryModal('in_stock')" class="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-emerald-100 dark:border-emerald-950/40 shadow-xs cursor-pointer active:scale-95 transition-all flex flex-col justify-between stat-card">
                        <div class="flex items-center justify-between gap-1 mb-1">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                            <i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-500"></i>
                        </div>
                        <p class="text-[9.5px] font-bold uppercase tracking-tight text-gray-500 dark:text-gray-400">Healthy</p>
                        <p id="mobileHealthyStockCount" class="text-sm font-black text-emerald-600 dark:text-emerald-400 leading-tight mt-0.5">0</p>
                    </div>

                    <!-- 4. Performing Stock Shortcut -->
                    <div onclick="window.showCentralInventoryModal('performing')" class="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-indigo-100 dark:border-indigo-950/40 shadow-xs cursor-pointer active:scale-95 transition-all flex flex-col justify-between stat-card">
                        <div class="flex items-center justify-between gap-1 mb-1">
                            <span class="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                            <i data-lucide="trending-up" class="w-3.5 h-3.5 text-indigo-500"></i>
                        </div>
                        <p class="text-[9.5px] font-bold uppercase tracking-tight text-gray-500 dark:text-gray-400">Performing</p>
                        <p id="mobilePerformingStockCount" class="text-sm font-black text-indigo-600 dark:text-indigo-400 leading-tight mt-0.5">0</p>
                    </div>
                </div>
            </div>

            <!-- Desktop / Large Screen Full Data Table -->
            <div class="hidden sm:block bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div class="table-scroll-wrapper relative">
                    <div class="overflow-x-auto w-full">
                        <table class="w-full text-xs sm:text-sm">
                            <thead class="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th class="text-center px-1.5 py-2 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-tight w-7 shrink-0">
                                        <input type="checkbox" id="selectAllCentralItems" onchange="window.toggleSelectAllCentralItems(this.checked)" class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer" title="Select All">
                                    </th>
                                    <th class="text-left px-1.5 sm:px-2.5 py-2 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-tight">Item Details</th>
                                    <th class="text-right px-1.5 sm:px-2 py-2 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-tight whitespace-nowrap">Stock</th>
                                    <th class="text-center px-1.5 sm:px-2 py-2 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-tight whitespace-nowrap">Assigned</th>
                                    <th class="text-right px-1.5 sm:px-2 py-2 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-tight whitespace-nowrap">Global Qty</th>
                                    <th class="text-right px-1.5 sm:px-2 py-2 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-tight whitespace-nowrap">Retail Price (TSh)</th>
                                    <th class="text-right px-1.5 sm:px-2 py-2 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-tight whitespace-nowrap">Wholesale Price (TSh)</th>
                                    <th class="text-center px-1.5 sm:px-2 py-2 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-tight whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-50 dark:divide-gray-800" id="centralInventoryTbody">
                                <tr><td colspan="8" class="py-12 text-center text-gray-400 text-sm">Loading items...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div id="centralInventoryPaginationFooter"></div>
            </div>
        </div>`;
        if (window.lucide) window.lucide.createIcons();

        // Wire premium filter dropdown change event listener cleanly
        const hiddenFilterInput = document.getElementById('invStatusFilter');
        if (hiddenFilterInput) {
            hiddenFilterInput.addEventListener('change', (e) => {
                window.filterCentralInventoryList(e.target.value, null);
            });
        }
    }

    const fetchOwnerId = window.state?.ownerId || window.state?.currentUserUuid || (window.state?.profile && window.state.profile.id) || (window.state?.user && window.state.user.id) || (typeof window.getCurrentOwnerId === 'function' ? window.getCurrentOwnerId() : null);

    try {
        const fetchTask = window.dbCentralInventory.fetchAll(fetchOwnerId);
        const timeoutTask = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Central inventory loading timed out (>5s)')), 5000)
        );

        let items;
        try {
            items = await Promise.race([fetchTask, timeoutTask]);
        } catch (timeoutOrErr) {
            console.warn('[Central Inventory 5s Watchdog Triggered]', timeoutOrErr.message);
            // Force retry once freshly
            items = await window.dbCentralInventory.fetchAll(fetchOwnerId);
        }

        items = items || [];
        items.forEach(i => {
            i.globalQty = i.inventory ? i.inventory.reduce((sum, inv) => sum + (inv.quantity || 0), 0) : 0;
            i.branchCount = i.inventory ? i.inventory.length : 0;
        });

        window._cachedCentralItems = items;

        const mainStoreCost = items.reduce((s, i) => s + (Number(i.cost_price || 0) * Number(i.main_store_stock || 0)), 0);
        const mainStoreExpectedSales = items.reduce((s, i) => s + (Number(i.retail_price || i.price || 0) * Number(i.main_store_stock || 0)), 0);
        const mainStoreProfitPotential = mainStoreExpectedSales - mainStoreCost;
        const totalGlobalExpectedSales = items.reduce((s, i) => s + (Number(i.retail_price || i.price || 0) * Number(i.globalQty)), 0);

        const totalRetailStockUnits = items.reduce((s, i) => s + (Number(i.retail_price || i.price || 0) > 0 ? Number(i.main_store_stock || 0) : 0), 0);
        const retailCatalogCount = items.filter(i => Number(i.retail_price || i.price || 0) > 0).length;

        const totalWholesaleStockUnits = items.reduce((s, i) => s + (Number(i.wholesale_price || 0) > 0 ? Number(i.main_store_stock || 0) : 0), 0);
        const wholesaleCatalogCount = items.filter(i => Number(i.wholesale_price || 0) > 0).length;

        const catalogCountEl = document.getElementById('centralCatalogCount');
        if (catalogCountEl) catalogCountEl.textContent = `${items.length} ${window.t('registered_catalogs', 'registered product catalogs')}`;

        const lowStockCount = items.filter(i => Number(i.main_store_stock || 0) <= Number(i.min_threshold || 5) || Number(i.globalQty || 0) <= Number(i.min_threshold || 5)).length;
        const healthyStockCount = items.filter(i => Number(i.main_store_stock || 0) > Number(i.min_threshold || 5) || Number(i.globalQty || 0) > Number(i.min_threshold || 5)).length;
        const performingStockCount = items.filter(i => (Number(i.retail_price || i.price || 0) > Number(i.cost_price || 0)) && (Number(i.main_store_stock || 0) > 0 || Number(i.globalQty || 0) > 0)).length;

        const mobileLowStock = document.getElementById('mobileLowStockCount');
        if (mobileLowStock) mobileLowStock.textContent = window.fmt.number(lowStockCount);

        const mobileHealthyStock = document.getElementById('mobileHealthyStockCount');
        if (mobileHealthyStock) mobileHealthyStock.textContent = window.fmt.number(healthyStockCount);

        const mobilePerformingStock = document.getElementById('mobilePerformingStockCount');
        if (mobilePerformingStock) mobilePerformingStock.textContent = window.fmt.number(performingStockCount);

        const statsGrid = document.getElementById('centralInventoryStatsGrid');
        if (statsGrid) {
            const currencySymbol = window.fmt ? window.fmt.getSymbol() : 'TSh';
            statsGrid.innerHTML = `
                <div class="relative bg-white dark:bg-gray-800 p-3 sm:px-4 sm:py-3.5 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs stat-card min-w-0 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-2 sm:right-3.5 px-1.5 sm:px-2 py-0.5 rounded-full text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-2xs z-10">${currencySymbol}</div>
                    <p class="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('main_store_cost', 'Main Store Stock Cost')}</p>
                    <div class="mt-1.5 sm:mt-2 min-w-0">
                        <span class="text-sm sm:text-lg lg:text-base xl:text-lg 2xl:text-xl font-black text-amber-600 dark:text-amber-400 truncate leading-tight block" title="${currencySymbol} ${window.fmt.number(mainStoreCost)}">${window.fmt.number(mainStoreCost)}</span>
                    </div>
                </div>
                <div class="relative bg-white dark:bg-gray-800 p-3 sm:px-4 sm:py-3.5 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs stat-card min-w-0 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-2 sm:right-3.5 px-1.5 sm:px-2 py-0.5 rounded-full text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">${currencySymbol}</div>
                    <p class="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('expected_sales_return', 'Expected Sales Return')}</p>
                    <div class="mt-1.5 sm:mt-2 min-w-0">
                        <span class="text-sm sm:text-lg lg:text-base xl:text-lg 2xl:text-xl font-black text-emerald-600 dark:text-emerald-400 truncate leading-tight block" title="${currencySymbol} ${window.fmt.number(mainStoreExpectedSales)}">${window.fmt.number(mainStoreExpectedSales)}</span>
                    </div>
                </div>
                <div class="relative bg-white dark:bg-gray-800 p-3 sm:px-4 sm:py-3.5 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs stat-card min-w-0 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-2 sm:right-3.5 px-1.5 sm:px-2 py-0.5 rounded-full text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs z-10">${currencySymbol}</div>
                    <p class="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('potential_profit', 'Potential Gross Profit')}</p>
                    <div class="mt-1.5 sm:mt-2 min-w-0">
                        <span class="text-sm sm:text-lg lg:text-base xl:text-lg 2xl:text-xl font-black text-indigo-600 dark:text-indigo-400 truncate leading-tight block" title="${currencySymbol} ${window.fmt.number(mainStoreProfitPotential)}">${window.fmt.number(mainStoreProfitPotential)}</span>
                    </div>
                </div>
                <div class="relative bg-white dark:bg-gray-800 p-3 sm:px-4 sm:py-3.5 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs stat-card min-w-0 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-2 sm:right-3.5 px-1.5 sm:px-2 py-0.5 rounded-full text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 shadow-2xs z-10">${currencySymbol}</div>
                    <p class="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('total_global_return', 'Total Global Expected Return')}</p>
                    <div class="mt-1.5 sm:mt-2 min-w-0">
                        <span class="text-sm sm:text-lg lg:text-base xl:text-lg 2xl:text-xl font-black text-purple-600 dark:text-purple-400 truncate leading-tight block" title="${currencySymbol} ${window.fmt.number(totalGlobalExpectedSales)}">${window.fmt.number(totalGlobalExpectedSales)}</span>
                    </div>
                </div>`;
        }

        window.filterCentralInventoryList();

    } catch (err) {
        const statsGrid = document.getElementById('centralInventoryStatsGrid');
        if (statsGrid) {
            statsGrid.innerHTML = `
                <div class="col-span-2 md:col-span-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900 flex items-center justify-between gap-3">
                    <p class="text-xs font-bold text-amber-800 dark:text-amber-300">Stats loading delayed.</p>
                    <button type="button" onclick="window.renderOwnerInventoryModule()" class="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg cursor-pointer">Force Reload</button>
                </div>
            `;
        }
        const tbody = document.getElementById('centralInventoryTbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" class="py-12 text-center select-none">
                <div class="flex flex-col items-center justify-center gap-2">
                    <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1 border border-amber-200 dark:border-amber-900/50 shadow-xs">
                        <i data-lucide="wifi-off" class="w-6 h-6"></i>
                    </div>
                    <p class="font-bold text-gray-900 dark:text-white text-sm">Couldn't Load Central Inventory Catalog</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 max-w-sm">Unable to fetch inventory items since you are currently offline or connection was interrupted.</p>
                    <button type="button" onclick="window.renderOwnerInventoryModule()" class="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer">
                        <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i>
                        <span>Retry Loading</span>
                    </button>
                </div>
            </td></tr>`;
            if (window.lucide) window.lucide.createIcons();
        }
    }
}

window.selectedCentralItemIds = window.selectedCentralItemIds || new Set();

window.selectedCentralItemIds = window.selectedCentralItemIds || new Set();

// Restricted to direct checkbox clicks only per user directive
window.onCentralRowClick = function(event, itemId) {
    return;
};

window.handleCentralItemCheck = function(itemId, isChecked) {
    if (isChecked) {
        window.selectedCentralItemIds.add(itemId);
    } else {
        window.selectedCentralItemIds.delete(itemId);
    }

    const row = document.querySelector(`tr[data-central-id="${itemId}"]`);
    if (row) {
        if (isChecked) {
            row.classList.add('bg-indigo-50/70', 'dark:bg-indigo-950/40');
        } else {
            row.classList.remove('bg-indigo-50/70', 'dark:bg-indigo-950/40');
        }
    }
    window.updateCentralSelectionUI();
};

window.toggleSelectAllCentralItems = function(isChecked) {
    const visibleItems = window.currentFilteredCentralInventory || window._cachedCentralItems || [];
    if (isChecked) {
        visibleItems.forEach(i => window.selectedCentralItemIds.add(i.id));
    } else {
        visibleItems.forEach(i => window.selectedCentralItemIds.delete(i.id));
    }

    document.querySelectorAll('.central-item-checkbox').forEach(cb => {
        cb.checked = isChecked;
    });

    window.updateCentralSelectionUI();
};

window.clearCentralSelection = function() {
    window.selectedCentralItemIds.clear();
    const selectAllCb = document.getElementById('selectAllCentralItems');
    const selectAllCbModal = document.getElementById('modalSelectAllCentralItems');
    if (selectAllCb) {
        selectAllCb.checked = false;
        selectAllCb.indeterminate = false;
    }
    if (selectAllCbModal) {
        selectAllCbModal.checked = false;
        selectAllCbModal.indeterminate = false;
    }
    document.querySelectorAll('.central-item-checkbox').forEach(cb => cb.checked = false);
    window.updateCentralSelectionUI();
};

window.updateCentralSelectionUI = function() {
    const count = window.selectedCentralItemIds.size;
    const bar = document.getElementById('centralBulkActionsBar');
    const barModal = document.getElementById('centralBulkActionsBarModal');
    const countText = document.getElementById('centralSelectedCountText');
    const countTextModal = document.getElementById('centralSelectedCountTextModal');
    const selectAllCb = document.getElementById('selectAllCentralItems');
    const selectAllCbModal = document.getElementById('modalSelectAllCentralItems');

    const visibleItems = window.currentFilteredCentralInventory || window._cachedCentralItems || [];
    const visibleCount = visibleItems.length;

    if (visibleCount > 0) {
        const selectedVisibleCount = visibleItems.filter(i => window.selectedCentralItemIds.has(i.id)).length;
        const allSelected = selectedVisibleCount === visibleCount && visibleCount > 0;
        const isIndeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleCount;

        if (selectAllCb) {
            selectAllCb.checked = allSelected;
            selectAllCb.indeterminate = isIndeterminate;
        }
        if (selectAllCbModal) {
            selectAllCbModal.checked = allSelected;
            selectAllCbModal.indeterminate = isIndeterminate;
        }
    }

    if (bar && countText) {
        if (count > 0) {
            bar.classList.remove('hidden');
            countText.textContent = `${count} ${count === 1 ? 'item' : 'items'} selected`;
        } else {
            bar.classList.add('hidden');
        }
    }

    if (barModal && countTextModal) {
        if (count > 0) {
            barModal.classList.remove('hidden');
            countTextModal.textContent = `${count} ${count === 1 ? 'item' : 'items'} selected`;
        } else {
            barModal.classList.add('hidden');
        }
    }
};

window.deleteSelectedCentralItems = async function() {
    const selectedArray = Array.from(window.selectedCentralItemIds);
    const count = selectedArray.length;

    if (count === 0) {
        window.showToast(window.t('no_items_selected', 'No items selected'), 'info');
        return;
    }

    const confirmed = await window.confirmModal(
        window.t('delete_selected_title', `Delete ${count} Selected Inventory Item(s)?`),
        window.t('delete_selected_msg', `Are you sure you want to permanently delete ${count} selected catalog item(s)? This will remove them from Central Inventory and all linked branch stock records.`),
        window.t('delete_selected_confirm', `Yes, Delete ${count} Items`),
        window.t('cancel', 'Cancel'),
        'bg-red-600 hover:bg-red-700 text-white'
    );

    if (!confirmed) return;

    try {
        window.showLoader(`Deleting ${count} catalog item(s)...`);

        await dbCentralInventory.bulkDelete(selectedArray);

        // Immediate local vanish animation
        window.vanishInventoryRows?.(selectedArray);

        // Realtime broadcast ping to all other devices on the account
        if (window.realtimeChannel) {
            try {
                window.realtimeChannel.send({
                    type: 'broadcast',
                    event: 'inventory_delete',
                    payload: { ids: selectedArray, ownerId: window.state?.ownerId, timestamp: Date.now() }
                });
            } catch (e) {
                console.warn('[Realtime] Broadcast delete ping notice:', e);
            }
        }

        window._cachedCentralItems = null;
        window._cachedBranchInventory = null;
        try { localStorage.setItem('bms_inv_sync', String(Date.now())); } catch (e) {}

        window.selectedCentralItemIds.clear();
        window.hideLoader();
        window.showToast(`Successfully deleted ${count} inventory item(s)!`, 'success');

        if (window.renderOwnerInventoryModule) await window.renderOwnerInventoryModule();
    } catch (err) {
        window.hideLoader();
        window.showToast('Failed to delete selected items: ' + err.message, 'error');
    }
};

window.deleteSingleCentralItem = async function(itemId, itemName) {
    const confirmed = await window.confirmModal(
        window.t('delete_single_title', `Delete Item "${itemName}"?`),
        window.t('delete_single_msg', `Are you sure you want to delete "${itemName}"? This will remove it from Central Inventory and all linked branch stock lists.`),
        window.t('delete_confirm', 'Yes, Delete Item'),
        window.t('cancel', 'Cancel'),
        'bg-red-600 hover:bg-red-700 text-white'
    );

    if (!confirmed) return;

    try {
        window.showLoader(`Deleting "${itemName}"...`);

        await dbCentralInventory.delete(itemId);

        // Immediate local vanish animation
        window.vanishInventoryRows?.(itemId);

        // Realtime broadcast ping to all other devices on the account
        if (window.realtimeChannel) {
            try {
                window.realtimeChannel.send({
                    type: 'broadcast',
                    event: 'inventory_delete',
                    payload: { ids: [itemId], ownerId: window.state?.ownerId, timestamp: Date.now() }
                });
            } catch (e) {
                console.warn('[Realtime] Broadcast delete ping notice:', e);
            }
        }

        window._cachedCentralItems = null;
        window._cachedBranchInventory = null;
        try { localStorage.setItem('bms_inv_sync', String(Date.now())); } catch (e) {}

        window.selectedCentralItemIds.delete(itemId);
        window.hideLoader();
        window.showToast(`Deleted "${itemName}" successfully!`, 'success');

        if (window.renderOwnerInventoryModule) await window.renderOwnerInventoryModule();
    } catch (err) {
        window.hideLoader();
        window.showToast('Failed to delete item: ' + err.message, 'error');
    }
};

window.centralInventoryPageState = window.centralInventoryPageState || {
    page: 1,
    pageSize: 10,
    modalPage: 1,
    modalPageSize: 10
};

window.changeCentralInventoryPage = function(delta) {
    const pageState = window.centralInventoryPageState;
    const items = window.currentFilteredCentralInventory || window._cachedCentralItems || [];
    const totalPages = Math.ceil(items.length / pageState.pageSize) || 1;
    const newPage = pageState.page + delta;
    if (newPage < 1 || newPage > totalPages) return;
    pageState.page = newPage;
    window.filterCentralInventoryList();
};

window.changeCentralInventoryModalPage = function(delta) {
    const pageState = window.centralInventoryPageState;
    const items = window.currentFilteredCentralInventory || window._cachedCentralItems || [];
    const totalPages = Math.ceil(items.length / pageState.modalPageSize) || 1;
    const newPage = pageState.modalPage + delta;
    if (newPage < 1 || newPage > totalPages) return;
    pageState.modalPage = newPage;
    window.filterModalCentralInventory();
};

window.filterCentralInventoryList = function(statusVal, searchVal) {
    if (statusVal !== undefined && statusVal !== null) {
        window.state._invStatusFilter = statusVal;
        window.centralInventoryPageState.page = 1;
    }
    if (searchVal !== undefined && searchVal !== null) {
        window.state._invSearch = searchVal;
        window.centralInventoryPageState.page = 1;
    }

    const items = window._cachedCentralItems || [];
    const savedStatus = window.state._invStatusFilter || 'all';
    const savedSearch = window.state._invSearch || '';

    let filtered = [...items];
    if (savedStatus === 'low' || savedStatus === 'low_stock') {
        filtered = filtered.filter(i => i.globalQty > 0 && i.globalQty <= (i.min_threshold || 5));
    } else if (savedStatus === 'out' || savedStatus === 'out_of_stock') {
        filtered = filtered.filter(i => i.globalQty === 0);
    } else if (savedStatus === 'in_stock') {
        filtered = filtered.filter(i => i.globalQty > (i.min_threshold || 5));
    }
    if (savedSearch) {
        const q = savedSearch.toLowerCase();
        filtered = filtered.filter(i => (i.name && i.name.toLowerCase().includes(q)) || (i.sku && i.sku.toLowerCase().includes(q)) || (i.category && i.category.toLowerCase().includes(q)));
    }

    window.currentFilteredCentralInventory = filtered;

    const tbody = document.getElementById('centralInventoryTbody');
    if (!tbody) return;

    const pageState = window.centralInventoryPageState;
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageState.pageSize) || 1;
    if (pageState.page > totalPages) pageState.page = totalPages;
    if (pageState.page < 1) pageState.page = 1;

    const startIndex = (pageState.page - 1) * pageState.pageSize;
    const pagedItems = filtered.slice(startIndex, startIndex + pageState.pageSize);

    tbody.innerHTML = pagedItems.length === 0 ? `<tr><td colspan="8" class="py-12 text-center text-gray-400 text-sm font-medium">No items found matching the selected filter</td></tr>` :
    pagedItems.map(i => {
        const threshold = i.min_threshold || 5;
        const isOut = i.globalQty === 0;
        const isLow = !isOut && i.globalQty <= threshold;
        const isChecked = window.selectedCentralItemIds.has(i.id);
        const safeName = (i.name || '').replace(/"/g, '&quot;');
        const supplierName = i.suppliers?.name || i.supplier_name || null;
        const supplierBtnHtml = supplierName ? `
            <button type="button" 
                    onclick="window.showSupplierTooltip(event, '${supplierName.replace(/'/g, "\\'")}')"
                    data-tooltip="Supplier: ${supplierName.replace(/"/g, '&quot;')}"
                    data-tooltip-title="Supplier Info"
                    data-tooltip-variant="indigo"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 rounded-md text-[9px] sm:text-[10px] font-bold border border-indigo-200/70 dark:border-indigo-800/70 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-2xs">
                <i data-lucide="truck" class="w-3 h-3 text-indigo-500"></i>
                <span>See Supplier</span>
            </button>
        ` : `
            <span class="text-gray-400 dark:text-gray-500 font-normal italic text-[9px] sm:text-[10px] whitespace-nowrap">No Supplier</span>
        `;

        const retailPrice = Number(i.retail_price || i.price || 0);
        const wholesalePrice = Number(i.wholesale_price || 0);

        return `
            <tr data-central-id="${i.id}" class="hover:bg-gray-100/70 dark:hover:bg-gray-800/60 transition-colors ${isChecked ? 'bg-indigo-50/70 dark:bg-indigo-950/40' : isOut ? 'bg-red-50/30' : isLow ? 'bg-amber-50/30' : ''}">
                <td class="px-2 py-2.5 text-center">
                    <input type="checkbox" class="central-item-checkbox rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer" value="${i.id}" ${isChecked ? 'checked' : ''} onchange="window.handleCentralItemCheck('${i.id}', this.checked)">
                </td>
                <td class="px-2 sm:px-3 py-2.5 max-w-[160px] sm:max-w-[220px] md:max-w-xs min-w-[140px]">
                    <p class="font-semibold text-gray-900 dark:text-white truncate" title="${safeName}">${i.name}</p>
                    <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span class="text-[10px] sm:text-xs text-gray-400 font-mono truncate" title="${i.sku ? `SKU: ${i.sku}` : (i.category || 'General')}">${i.sku ? `SKU: ${i.sku}` : (i.category || 'General')}</span>
                        ${supplierBtnHtml}
                    </div>
                </td>
                <td class="px-2 sm:px-3 py-2.5 text-right font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">${window.fmt.number(i.main_store_stock || 0)}</td>
                <td class="px-2 sm:px-3 py-2.5 text-center text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    <span class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs">${i.branchCount} branches</span>
                </td>
                <td class="px-2 sm:px-3 py-2.5 text-right font-bold whitespace-nowrap ${isOut ? 'text-red-600 dark:text-red-400' : isLow ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}">${window.fmt.number(i.globalQty)}</td>
                <td class="px-2 sm:px-3 py-2.5 text-right text-gray-900 dark:text-white font-semibold whitespace-nowrap">
                    ${retailPrice > 0 ? window.fmt.currency(retailPrice) : '<span class="text-gray-400 font-normal text-xs">TSh 0</span>'}
                </td>
                <td class="px-2 sm:px-3 py-2.5 text-right text-teal-600 dark:text-teal-400 font-semibold whitespace-nowrap">
                    ${wholesalePrice > 0 ? window.fmt.currency(wholesalePrice) : '<span class="text-gray-400 font-normal text-xs">-</span>'}
                </td>
                <td class="px-2 sm:px-3 py-2.5 text-center whitespace-nowrap">
                    <div class="inline-flex items-center justify-center gap-1">
                        <button onclick="window.openDispatchModal('${i.id}', '${i.name.replace(/'/g, "\\'")}', ${i.main_store_stock || 0})" data-tooltip="Dispatch units of this product to a selected branch" data-tooltip-title="Dispatch" data-tooltip-variant="indigo" class="px-2 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:hover:bg-indigo-900/60 font-bold rounded text-[10px] sm:text-xs transition-colors cursor-pointer whitespace-nowrap">
                            Dispatch
                        </button>
                        <button onclick="window.openEditCentralItemModal('${i.id}')" data-tooltip="Edit product details, prices, and low-stock alerts" data-tooltip-title="Edit Item" data-tooltip-variant="amber" class="px-2 py-1 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400 dark:hover:bg-amber-900/60 font-bold rounded text-[10px] sm:text-xs transition-colors cursor-pointer whitespace-nowrap">
                            Edit
                        </button>
                        <button onclick="window.deleteSingleCentralItem('${i.id}', '${i.name.replace(/'/g, "\\'")}')" data-tooltip="Permanently delete product from central catalog" data-tooltip-title="Delete Product" data-tooltip-variant="rose" class="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-900/60 font-bold rounded text-[10px] sm:text-xs transition-colors cursor-pointer whitespace-nowrap">
                            <i data-lucide="trash-2" class="w-3 h-3"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    }).join('');

    const footer = document.getElementById('centralInventoryPaginationFooter');
    if (footer) {
        footer.innerHTML = `
            <div class="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700/60">
                <p class="text-xs text-gray-500 dark:text-gray-400 font-medium">Showing <span class="font-bold text-gray-900 dark:text-white">${pagedItems.length}</span> of <span class="font-bold text-gray-900 dark:text-white">${totalItems}</span> catalog items</p>
                <div class="flex items-center gap-2">
                    <button onclick="window.changeCentralInventoryPage(-1)" ${pageState.page === 1 ? 'disabled' : ''} class="p-1.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                        <i data-lucide="chevron-left" class="w-4 h-4 text-gray-600 dark:text-gray-300"></i>
                    </button>
                    <span class="text-xs font-bold text-gray-600 dark:text-gray-300 px-1">Page ${pageState.page} of ${totalPages}</span>
                    <button onclick="window.changeCentralInventoryPage(1)" ${pageState.page === totalPages ? 'disabled' : ''} class="p-1.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                        <i data-lucide="chevron-right" class="w-4 h-4 text-gray-600 dark:text-gray-300"></i>
                    </button>
                </div>
            </div>
        `;
    }

    window.updateCentralSelectionUI();

    if (window.lucide) window.lucide.createIcons({ scope: tbody });
};

window.showSupplierTooltip = function(e, supplierName) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    if (typeof window.showToast === 'function') {
        window.showToast(`Supplier: ${supplierName}`, 'info');
    }
};

window.openDispatchModal = async function(centralItemId, itemName, currentStock) {
    const branches = await window.dbBranches.fetchAll(window.state.ownerId);

    const branchOptions = branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');

    const modalHtml = `
            <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
                <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i><span>${window.t('back', 'Back')}</span>
                </button>
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <i data-lucide="truck" class="w-4 h-4"></i>
                    </div>
                    <h3 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white">${window.t('dispatch_stock', 'Dispatch Stock')}</h3>
                </div>
            </div>
            <form onsubmit="window.submitDispatchStock(event, '${centralItemId}')" class="p-6 space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">${window.t('item_name', 'Item')}</label>
                    <p class="text-gray-900 font-semibold">${itemName}</p>
                    <p class="text-xs text-gray-500 mt-1">Available in Main Store: <span class="font-bold text-indigo-600">${currentStock}</span></p>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">${window.t('destination_branch', 'Destination Branch')}</label>
                    <select id="dispatchBranch" required class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="">-- ${window.t('select_branch', 'Select Branch')} --</option>
                        ${branchOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">${window.t('qty_to_dispatch', 'Quantity to Dispatch')}</label>
                    <input type="text" inputmode="decimal" id="dispatchQty" required placeholder="e.g. 100" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none number-format">
                </div>
            <div class="p-3 sm:p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-2.5 sm:gap-4 bg-gray-50/80 dark:bg-gray-900/80 mt-auto flex-shrink-0">
                <button type="button" onclick="closeModal()" class="px-3.5 py-1.5 sm:px-6 sm:py-2.5 font-bold rounded-xl transition-all text-xs sm:text-sm bg-red-600 text-white hover:bg-red-700 shadow-sm border-none min-w-[85px] sm:min-w-[140px] flex items-center justify-center">${window.t('cancel', 'Cancel')}</button>
                <button type="submit" class="px-3.5 py-1.5 sm:px-6 sm:py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 min-w-[110px] sm:min-w-[180px]">
                    <i data-lucide="truck" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> ${window.t('dispatch_stock', 'Dispatch')}
                </button>
            </div>
            </form>`;
    openModal(modalHtml);
};

window.submitDispatchStock = async function(e, centralItemId) {
    e.preventDefault();
    const branchId = document.getElementById('dispatchBranch').value;
    const qty = window.fmt.parseNumber(document.getElementById('dispatchQty').value || 0);

    try {
        window.showLoader('Dispatching stock...');
        await window.dbCentralInventory.dispatchStock(centralItemId, branchId, qty);
        closeModal();
        window.showToast('Stock dispatched successfully!', 'success');
        if (window.renderOwnerInventoryModule) window.renderOwnerInventoryModule();
    } catch(err) {
        window.showToast(err.message, 'error');
    } finally {
        window.hideLoader();
    }
};

window.downloadCentralCSVTemplate = function () {
    const headers = [
        'name',
        'sku',
        'category',
        'retail_price',
        'wholesale_price',
        'cost_price',
        'main_store_stock',
        'min_threshold',
        'unit',
        'description'
    ];
    const instructions = [
        "INSTRUCTIONS: Fill in your main store details into the columns on the LEFT.",
        "REQUIRED FIELD: 'name'. All other columns are optional.",
        "DO NOT DELETE OR MODIFY THE HEADER NAMES OR THIS RIGHT-HAND INSTRUCTION COLUMN.",
        "The system automatically parses data on the left and ignores this right column.",
        "COLUMN GUIDE:",
        "• name: Item Name (e.g. Rice 50kg bag)",
        "• sku: SKU / Barcode / Code",
        "• category: Category name",
        "• retail_price: Retail Price / Bei ya Rejareja",
        "• wholesale_price: Wholesale Price / Bei ya Jumla",
        "• cost_price: Buying Cost Price / Bei ya Kununulia",
        "• main_store_stock: Warehouse Quantity",
        "• min_threshold: Low Stock Alert Level",
        "• unit: Unit of measure (bag, pcs, box)",
        "• description: Product Notes"
    ];

    const sampleRows = [
        ['Sample Rice 50kg', 'SKU-5001', 'Grains', '85000', '78000', '70000', '20', '3', 'bag', 'Main Store Rice Bag'],
        ['Sample Sugar 50kg', 'SKU-5002', 'Grains', '110000', '102000', '95000', '15', '2', 'bag', 'Main Store Sugar Bag']
    ];

    window.downloadCSVTemplate('main_store_inventory_template.csv', headers, instructions, sampleRows);
};

window.importCentralCSV = function () {
    window.triggerCSVUpload(async (data) => {
        if (!data || data.length === 0) {
            window.showToast('CSV is empty or invalid', 'error');
            return;
        }

        window.showLoader('Importing main store stock items...');
        let successCount = 0;
        let failCount = 0;

        try {
            const branches = await dbBranches.fetchAll(state.ownerId);

            for (const row of data) {
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

                const name = getVal('name', 'itemname', 'productname', 'item_name') || '';
                const category = getVal('category', 'cat') || 'General';
                const sku = getVal('sku', 'code', 'barcode', 'sku_code') || window.generateAutoSKU(category, name, successCount + 1);
                const mainStoreStock = fmt.parseNumber(getVal('main_store_stock', 'mainstorestock', 'initialmainstorestock', 'quantity', 'qty', 'stock') || 0);
                const costPrice = fmt.parseNumber(getVal('cost_price', 'costprice', 'purchaseprice', 'cost') || 0);
                const retailPrice = fmt.parseNumber(getVal('retail_price', 'retailprice', 'sellingprice', 'price') || 0);
                const wholesalePrice = fmt.parseNumber(getVal('wholesale_price', 'wholesaleprice', 'wholesale') || retailPrice || 0);
                const minThreshold = fmt.parseNumber(getVal('min_threshold', 'minthreshold', 'lowstockthreshold', 'threshold') || 5);
                const unit = getVal('unit', 'uom') || null;
                const description = getVal('description', 'notes') || '';

                if (!name || name === 'Unnamed Item') {
                    continue; // Skip blank instruction overflow rows
                }

                try {
                    const centralItem = await window.dbCentralInventory.add({
                        owner_id: window.state.ownerId,
                        name,
                        sku,
                        category,
                        cost_price: costPrice,
                        price: retailPrice,
                        retail_price: retailPrice,
                        wholesale_price: wholesalePrice,
                        min_threshold: minThreshold,
                        main_store_stock: mainStoreStock,
                        unit,
                        description
                    });

                    if (centralItem && branches && branches.length > 0) {
                        const branchPayload = {
                            name: centralItem.name,
                            sku: centralItem.sku,
                            category: centralItem.category,
                            cost_price: costPrice,
                            price: retailPrice,
                            min_threshold: minThreshold,
                            quantity: 0,
                            central_item_id: centralItem.id,
                            is_from_main_store: true
                        };
                        await Promise.all(branches.map(b => dbInventory.add(b.id, branchPayload)));
                    }
                    successCount++;
                } catch (e) {
                    console.error('[CentralImport] Failed row:', name, e);
                    failCount++;
                }
            }

            window.hideLoader();

            if (successCount > 0) {
                window.showToast(`Successfully imported ${successCount} main store items!`, 'success');
                if (typeof window.renderOwnerInventoryModule === 'function') window.renderOwnerInventoryModule();
            } else {
                window.showToast('No valid items found in CSV', 'warning');
            }
        } catch (err) {
            window.hideLoader();
            window.showToast('Import error: ' + err.message, 'error');
        }
    });
};

window.renderCentralInventoryModalCards = function(items) {
    if (!items || items.length === 0) {
        return `<div class="py-12 text-center text-gray-400 text-sm font-semibold">${window.t('no_items_found', 'No items found matching search or filter')}</div>`;
    }

    return items.map(i => {
        const threshold = i.min_threshold || 5;
        const isOut = i.globalQty === 0;
        const isLow = !isOut && i.globalQty <= threshold;
        const isChecked = window.selectedCentralItemIds.has(i.id);
        const safeName = (i.name || '').replace(/"/g, '&quot;');

        const statusText = isOut ? 'Out of Global Stock' : isLow ? 'Low Global Stock' : 'In Stock';
        const statusBadge = isOut ? `
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 shrink-0 self-start">${statusText}</span>
        ` : isLow ? `
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0 self-start">${statusText}</span>
        ` : `
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0 self-start">${statusText}</span>
        `;

        const branchCount = i.branchCount !== undefined ? i.branchCount : (i.inventory ? i.inventory.length : 0);

        return `
        <div data-central-id="${i.id}" onclick="window.onCentralRowClick(event, '${i.id}')" class="bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-2.5 cursor-pointer transition-all hover:border-indigo-300 dark:hover:border-indigo-700 ${isChecked ? 'ring-2 ring-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30' : ''}">
            <div class="flex justify-between items-start gap-2.5 border-b border-gray-100 dark:border-gray-700/60 pb-2.5 min-w-0">
                <div class="flex items-start gap-2.5 min-w-0 flex-1">
                    <input type="checkbox" class="central-item-checkbox rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 mt-0.5 cursor-pointer shrink-0" value="${i.id}" ${isChecked ? 'checked' : ''} onchange="window.handleCentralItemCheck('${i.id}', this.checked)">
                    <div class="min-w-0 flex-1">
                        <span class="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm block leading-snug break-words hyphens-auto" style="word-break: break-word; overflow-wrap: anywhere;" title="${safeName}">${i.name}</span>
                        <span class="text-[10px] text-gray-400 font-medium block mt-0.5 truncate">${i.sku ? `SKU: ${i.sku}` : 'No SKU'} · ${i.category || 'No Category'}</span>
                    </div>
                </div>
                ${statusBadge}
            </div>
            <div class="space-y-1.5 text-xs">
                <div class="flex justify-between items-center">
                    <span class="text-gray-500 font-bold uppercase tracking-wider text-[9px]">${window.t('main_store_qty', 'Main Store Stock')}</span>
                    <span class="font-extrabold text-indigo-600 dark:text-indigo-400">${window.fmt.number(i.main_store_stock || 0)}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-500 font-bold uppercase tracking-wider text-[9px]">${window.t('assigned_branches', 'Assigned Branches')}</span>
                    <span class="font-extrabold text-gray-700 dark:text-gray-300">${branchCount} branches</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-500 font-bold uppercase tracking-wider text-[9px]">${window.t('global_qty', 'Global Qty')}</span>
                    <span class="font-black ${isOut ? 'text-red-600 dark:text-red-400' : isLow ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}">${window.fmt.number(i.globalQty || 0)}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-500 font-bold uppercase tracking-wider text-[9px]">${window.t('cost_price', 'Cost Price')}</span>
                    <span class="font-extrabold text-amber-600 dark:text-amber-400">${window.fmt.currency(i.cost_price || 0)}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-500 font-bold uppercase tracking-wider text-[9px]">${window.t('selling_price', 'Selling Price')}</span>
                    <span class="font-extrabold text-emerald-600 dark:text-emerald-400">${window.fmt.currency(i.price || 0)}</span>
                </div>
                <div class="flex items-center justify-between gap-2 pt-2.5 mt-2 border-t border-gray-100 dark:border-gray-700/60">
                    <button onclick="window.closeCentralInventoryModal(); window.openEditCentralItemModal('${i.id}')" class="px-2.5 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400 font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5"></i> ${window.t('edit', 'Edit')}
                    </button>
                    <button onclick="window.closeCentralInventoryModal(); window.openDispatchModal('${i.id}', '${i.name.replace(/'/g, "\\'")}', ${i.main_store_stock || 0})" class="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer">
                        <i data-lucide="send" class="w-3.5 h-3.5"></i> ${window.t('dispatch', 'Dispatch')}
                    </button>
                    <button onclick="window.deleteSingleCentralItem('${i.id}', '${i.name.replace(/'/g, "\\'")}')" class="px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400 font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer" title="Delete Item">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> ${window.t('delete', 'Delete')}
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
};

window.filterModalCentralInventory = function(statusVal, searchVal) {
    if (statusVal !== undefined && statusVal !== null) {
        window.state._invStatusFilter = statusVal;
        window.centralInventoryPageState.modalPage = 1;
    }
    if (searchVal !== undefined && searchVal !== null) {
        window.state._invSearch = searchVal;
        window.centralInventoryPageState.modalPage = 1;
    }

    const items = window._cachedCentralItems || window.currentFilteredCentralInventory || [];
    const savedStatus = window.state._invStatusFilter || 'all';
    const savedSearch = window.state._invSearch || '';

    let filtered = [...items];
    if (savedStatus === 'low' || savedStatus === 'low_stock') {
        filtered = filtered.filter(i => (Number(i.main_store_stock || 0) > 0 && Number(i.main_store_stock || 0) <= Number(i.min_threshold || 5)) || (Number(i.globalQty || 0) > 0 && Number(i.globalQty || 0) <= Number(i.min_threshold || 5)));
    } else if (savedStatus === 'out' || savedStatus === 'out_of_stock') {
        filtered = filtered.filter(i => Number(i.main_store_stock || 0) === 0 && Number(i.globalQty || 0) === 0);
    } else if (savedStatus === 'healthy' || savedStatus === 'in_stock') {
        filtered = filtered.filter(i => Number(i.main_store_stock || 0) > Number(i.min_threshold || 5) || Number(i.globalQty || 0) > Number(i.min_threshold || 5));
    } else if (savedStatus === 'performing') {
        filtered = filtered.filter(i => (Number(i.retail_price || i.price || 0) > Number(i.cost_price || 0)) && (Number(i.main_store_stock || 0) > 0 || Number(i.globalQty || 0) > 0));
        filtered.sort((a, b) => (Number(b.retail_price || b.price || 0) * Number(b.globalQty || b.main_store_stock || 0)) - (Number(a.retail_price || a.price || 0) * Number(a.globalQty || a.main_store_stock || 0)));
    }
    if (savedSearch) {
        const q = savedSearch.toLowerCase();
        filtered = filtered.filter(i => (i.name && i.name.toLowerCase().includes(q)) || (i.sku && i.sku.toLowerCase().includes(q)) || (i.category && i.category.toLowerCase().includes(q)));
    }

    window.currentFilteredCentralInventory = filtered;

    const pageState = window.centralInventoryPageState;
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageState.modalPageSize) || 1;
    if (pageState.modalPage > totalPages) pageState.modalPage = totalPages;
    if (pageState.modalPage < 1) pageState.modalPage = 1;

    const startIndex = (pageState.modalPage - 1) * pageState.modalPageSize;
    const pagedItems = filtered.slice(startIndex, startIndex + pageState.modalPageSize);

    const container = document.getElementById('modalCentralInventoryList');
    if (container) {
        container.innerHTML = window.renderCentralInventoryModalCards(pagedItems);

        let footer = document.getElementById('modalCentralInventoryPaginationFooter');
        if (!footer) {
            footer = document.createElement('div');
            footer.id = 'modalCentralInventoryPaginationFooter';
            container.parentNode.appendChild(footer);
        }
        footer.innerHTML = `
            <div class="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700/60 mt-3 rounded-2xl shadow-xs">
                <p class="text-xs text-gray-500 dark:text-gray-400 font-medium">Showing <span class="font-bold text-gray-900 dark:text-white">${pagedItems.length}</span> of <span class="font-bold text-gray-900 dark:text-white">${totalItems}</span> items</p>
                <div class="flex items-center gap-2">
                    <button onclick="window.changeCentralInventoryModalPage(-1)" ${pageState.modalPage === 1 ? 'disabled' : ''} class="p-1.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                        <i data-lucide="chevron-left" class="w-4 h-4 text-gray-600 dark:text-gray-300"></i>
                    </button>
                    <span class="text-xs font-bold text-gray-600 dark:text-gray-300 px-1">Page ${pageState.modalPage} of ${totalPages}</span>
                    <button onclick="window.changeCentralInventoryModalPage(1)" ${pageState.modalPage === totalPages ? 'disabled' : ''} class="p-1.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                        <i data-lucide="chevron-right" class="w-4 h-4 text-gray-600 dark:text-gray-300"></i>
                    </button>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
    }
};

window.showCentralInventoryModal = function(initialFilter) {
    if (initialFilter) {
        window.state._invStatusFilter = initialFilter;
    }
    const activeFilter = window.state._invStatusFilter || 'all';
    const activeSearch = window.state._invSearch || '';

    const modalHtml = `
        <div class="flex flex-col h-full bg-slate-50/50 dark:bg-gray-900 overflow-hidden">
            <div class="modal-top-nav flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                        <i data-lucide="package" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">${window.t('inventory_items', 'Inventory Items')}</h3>
                    </div>
                </div>
                <button type="button" onclick="window.closeCentralInventoryModal()" data-close-text="${window.t('exit', 'Exit')}" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <!-- Sticky Fixed Bulk Actions Bar directly below Modal Top Header -->
            <div id="centralBulkActionsBarModal" class="hidden flex-none flex items-center justify-between gap-3 px-4 py-3 bg-red-600 dark:bg-red-700 text-white shadow-md z-30 transition-all border-b border-red-700 dark:border-red-800">
                <div class="flex items-center gap-2.5">
                    <input type="checkbox" id="modalSelectAllCentralItems" onchange="window.toggleSelectAllCentralItems(this.checked)" class="rounded border-white/60 text-red-700 focus:ring-white w-4 h-4 cursor-pointer" title="Select All">
                    <p id="centralSelectedCountTextModal" class="text-xs font-black tracking-wide text-white">0 items selected</p>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" onclick="window.clearCentralSelection()" class="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer">
                        Clear
                    </button>
                    <button type="button" onclick="window.deleteSelectedCentralItems()" class="px-3 py-1 bg-white text-red-600 hover:bg-red-50 font-black rounded-lg text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        <span>Delete Selected</span>
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-3 scroller-custom">
                <div id="modalCentralInventoryList" class="space-y-3">
                    <div class="py-12 text-center text-gray-400 text-sm">Loading items...</div>
                </div>
            </div>

            <div class="modal-bottom-nav flex-none p-3 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3 z-20">
                <div class="flex-1 relative">
                    <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"></i>
                    <input type="text" id="modalInvSearchInput" placeholder="${window.t('search_main_store', 'Search main store...')}" value="${activeSearch}"
                        class="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                        style="padding-left: 2.85rem !important;"
                        oninput="window.filterModalCentralInventory(null, this.value)">
                </div>
                <div class="flex-1">
                    ${window.renderPremiumSelect({
                        id: 'modalInvStatusFilter',
                        selectedValue: activeFilter,
                        searchable: false,
                        classes: 'w-full text-xs sm:text-sm rounded-full',
                        onChange: 'window.filterModalCentralInventory(this.value, null)',
                        options: [
                            { value: 'all', label: window.t('all_stock_status', 'All Stock Status'), icon: 'filter' },
                            { value: 'in_stock', label: window.t('in_stock', 'In Stock'), icon: 'check-circle' },
                            { value: 'low_stock', label: window.t('low_stock', 'Low Global Stock'), icon: 'alert-triangle' },
                            { value: 'out_of_stock', label: window.t('out_of_stock', 'Out of Global Stock'), icon: 'x-circle' }
                        ]
                    })}
                </div>
            </div>
        </div>
    `;

    openModal(modalHtml);

    if (window.lucide) window.lucide.createIcons();

    const hiddenFilterInput = document.getElementById('modalInvStatusFilter');
    if (hiddenFilterInput) {
        hiddenFilterInput.addEventListener('change', (e) => {
            window.filterModalCentralInventory(e.target.value, null);
        });
    }

    window.filterModalCentralInventory();
};

window.closeCentralInventoryModal = function() {
    closeModal();
};

window.openEditCentralItemModal = async function(itemId) {
    try {
        const items = await window.dbCentralInventory.fetchAll(window.state.ownerId);
        const item = items.find(i => i.id === itemId);
        if (!item) throw new Error('Stock item not found');

        const suppliers = await dbSuppliers.fetchAll(state.ownerId);
        const supplierOptions = suppliers.map(s => `
            <option value="${s.id}" ${item.supplier_id === s.id ? 'selected' : ''}>${s.name}</option>
        `).join('');

        const modalHtml = `
            <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
                <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i><span>${window.t('back', 'Back')}</span>
                </button>
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </div>
                    <h3 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white">${window.t('edit_stock_item', 'Edit Stock Item')}</h3>
                </div>
            </div>
            <form onsubmit="window.updateCentralItem(event, '${item.id}')" class="flex flex-col flex-1 overflow-hidden">
                <div class="flex-1 overflow-y-auto p-6 space-y-6">
                    <!-- Basic Details -->
                    <div>
                        <h4 class="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">${window.t('basic_financial_details', 'Basic & Financial Details')}</h4>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('item_name', 'Item Name')} *</label>
                                <input type="text" id="editCiName" required value="${item.name.replace(/"/g, '&quot;')}" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('sku_code', 'SKU / Code')}</label>
                                <input type="text" id="editCiSku" value="${item.sku || ''}" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('category', 'Category')} *</label>
                                <input type="text" id="editCiCategory" required value="${item.category.replace(/"/g, '&quot;')}" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('initial_stock', 'Main Store Stock')} *</label>
                                <input type="text" inputmode="decimal" id="editCiMainStoreStock" value="${window.fmt.number(item.main_store_stock || 0)}" required oninput="window.calcEditCentralFinancials()" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-indigo-600 number-format">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('purchase_price', 'Purchase Price per Item (Cost)')} *</label>
                                <input type="text" inputmode="decimal" id="editCiCostPrice" required value="${window.fmt.number(item.cost_price || 0)}" oninput="window.calcEditCentralFinancials()" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-amber-600 number-format">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('selling_prices', 'Selling Prices')} *</label>
                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <span class="block text-[9px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">${window.t('wholesale', 'Wholesale')}</span>
                                        <input type="text" inputmode="decimal" id="editCiWholesalePrice" required value="${window.fmt.number(item.wholesale_price ?? item.price ?? 0)}" oninput="window.calcEditCentralFinancials()" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600 number-format">
                                    </div>
                                    <div>
                                        <span class="block text-[9px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">${window.t('retail', 'Retail')}</span>
                                        <input type="text" inputmode="decimal" id="editCiRetailPrice" required value="${window.fmt.number(item.retail_price ?? item.price ?? 0)}" oninput="window.calcEditCentralFinancials()" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-emerald-600 number-format">
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('low_stock_threshold', 'Low Stock Threshold')}</label>
                                <input type="text" inputmode="decimal" id="editCiThreshold" value="${window.fmt.number(item.min_threshold || 5)}" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all number-format">
                            </div>
                        </div>
                    </div>

                    <!-- Financial Calculation Preview Box -->
                    <div class="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-1.5">
                        <h5 class="text-[11px] font-black uppercase tracking-wider text-[#475B6E] mb-1.5">${window.t('financial_return_calc', 'Financial Return Calculation')}</h5>
                        <div class="space-y-1.5">
                            <div class="bg-white px-3 py-1.5 rounded-xl border border-slate-200/70 shadow-xs flex items-center justify-between gap-4">
                                <p class="text-[10px] text-gray-500 font-bold uppercase tracking-tight">${window.t('total_cost', 'Total Cost')}</p>
                                <p id="editCalcTotalCost" class="text-xs sm:text-sm font-black text-amber-600 whitespace-nowrap">TZS 0</p>
                            </div>
                            <div class="bg-white px-3 py-1.5 rounded-xl border border-slate-200/70 shadow-xs flex items-center justify-between gap-4">
                                <p class="text-[10px] text-gray-500 font-bold uppercase tracking-tight">${window.t('expected_sales_return', 'Expected Sales Value')}</p>
                                <p id="editCalcExpectedSales" class="text-xs sm:text-sm font-black text-emerald-600 whitespace-nowrap">TZS 0</p>
                            </div>
                            <div class="bg-white px-3 py-1.5 rounded-xl border border-slate-200/70 shadow-xs flex items-center justify-between gap-4">
                                <p class="text-[10px] text-gray-500 font-bold uppercase tracking-tight">${window.t('potential_profit', 'Potential Gross Profit')}</p>
                                <p id="editCalcPotentialProfit" class="text-xs sm:text-sm font-black text-[#475B6E] whitespace-nowrap">TZS 0</p>
                            </div>
                        </div>
                    </div>

                    <!-- Supplier Details -->
                    <div>
                        <h4 class="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">${window.t('supplier_details', 'Supplier & Details')}</h4>
                        <div class="grid grid-cols-1 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('supplier', 'Supplier')}</label>
                                <select id="editCiSupplier" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                                    <option value="">${window.t('no_supplier', '-- No Supplier --')}</option>
                                    ${supplierOptions}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('description', 'Description')}</label>
                                <textarea id="editCiDescription" rows="2" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">${item.description || ''}</textarea>
                            </div>
                        </div>
                    </div>
                </div>
            <div class="p-3 sm:p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-2.5 sm:gap-4 bg-gray-50/80 dark:bg-gray-900/80 mt-auto flex-shrink-0">
                <button type="button" onclick="window.closeEditCentralItemModal()" class="px-3.5 py-1.5 sm:px-6 sm:py-2.5 font-bold rounded-xl transition-all text-xs sm:text-sm bg-red-600 text-white hover:bg-red-700 shadow-sm border-none min-w-[85px] sm:min-w-[140px] flex items-center justify-center">${window.t('cancel', 'Cancel')}</button>
                <button type="submit" class="px-3.5 py-1.5 sm:px-6 sm:py-2.5 bg-[#475B6E] text-white font-bold rounded-xl hover:bg-[#394a5a] shadow-md transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 min-w-[110px] sm:min-w-[180px]">
                    <i data-lucide="check" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> ${window.t('save_changes', 'Save Changes')}
                </button>
            </div>
            </form>
        `;

        openModal(modalHtml);
        window.calcEditCentralFinancials();
    } catch (err) {
        window.showToast('Failed to load edit modal: ' + err.message, 'error');
    }
};

window.closeEditCentralItemModal = function() {
    closeModal();
};

window.calcEditCentralFinancials = function() {
    const qty = window.fmt.parseNumber(document.getElementById('editCiMainStoreStock')?.value || 0);
    const cost = window.fmt.parseNumber(document.getElementById('editCiCostPrice')?.value || 0);
    const price = window.fmt.parseNumber(document.getElementById('editCiRetailPrice')?.value || 0);

    const totalCost = qty * cost;
    const expectedSales = qty * price;
    const profit = expectedSales - totalCost;

    if (document.getElementById('editCalcTotalCost')) document.getElementById('editCalcTotalCost').textContent = window.fmt.currency(totalCost);
    if (document.getElementById('editCalcExpectedSales')) document.getElementById('editCalcExpectedSales').textContent = window.fmt.currency(expectedSales);
    if (document.getElementById('editCalcPotentialProfit')) document.getElementById('editCalcPotentialProfit').textContent = window.fmt.currency(profit);
};

window.updateCentralItem = async function(e, itemId) {
    e.preventDefault();

    const costPrice = window.fmt.parseNumber(document.getElementById('editCiCostPrice').value || 0);
    const retailPrice = window.fmt.parseNumber(document.getElementById('editCiRetailPrice').value || 0);
    const wholesalePrice = window.fmt.parseNumber(document.getElementById('editCiWholesalePrice').value || 0);
    const mainStoreStock = window.fmt.parseNumber(document.getElementById('editCiMainStoreStock').value || 0);
    const minThreshold = window.fmt.parseNumber(document.getElementById('editCiThreshold').value || 5);

    const payload = {
        name: document.getElementById('editCiName').value,
        sku: document.getElementById('editCiSku').value,
        category: document.getElementById('editCiCategory').value,
        cost_price: costPrice,
        price: retailPrice, // legacy price fallback
        retail_price: retailPrice,
        wholesale_price: wholesalePrice,
        min_threshold: minThreshold,
        main_store_stock: mainStoreStock,
        supplier_id: document.getElementById('editCiSupplier').value || null,
        description: document.getElementById('editCiDescription').value || null
    };

    try {
        window.showLoader('Updating Central Inventory catalog...');
        await dbCentralInventory.update(itemId, payload);
        window.hideLoader();
        window.closeEditCentralItemModal();
        window.showToast('Stock item updated successfully in Central Inventory!', 'success');
        if (window.renderOwnerInventoryModule) window.renderOwnerInventoryModule();
    } catch (err) {
        window.hideLoader();
        window.showToast('Failed to update stock item: ' + err.message, 'error');
    }
};

window.openCentralDispatchView = async function(preselectBranchId = null) {
    sessionStorage.setItem('bms_central_subview', 'dispatch_hub');
    sessionStorage.setItem('bms_last_active_view', 'central_dispatch');
    state.activeView = 'central_dispatch';

    const container = document.getElementById('mainContent');
    if (!container) return;

    window.showLoader('Loading Central Dispatch Hub...');

    try {
        const branches = await dbBranches.fetchAll(state.ownerId);
        const centralItems = await dbCentralInventory.fetchAll(state.ownerId);

        if (!branches || branches.length === 0) {
            window.hideLoader();
            window.showToast('Please add at least one branch before dispatching stock.', 'warning');
            return;
        }

        const savedBranch = sessionStorage.getItem('bms_central_dispatch_branch');
        let selectedBranchId = preselectBranchId || (branches.some(b => b.id === savedBranch) ? savedBranch : branches[0].id);
        sessionStorage.setItem('bms_central_dispatch_branch', selectedBranchId);

        let dispatchState = {}; // centralItemId -> qty

        const renderDispatchPage = async () => {
            const targetBranchInvRes = await dbInventory.fetchAll(selectedBranchId, { pageSize: 10000 });
            const targetBranchItems = targetBranchInvRes.items || [];
            const branchMap = {};
            targetBranchItems.forEach(i => {
                if (i.central_item_id) branchMap[i.central_item_id] = i.quantity || 0;
                else if (i.sku) branchMap[i.sku] = i.quantity || 0;
                else if (i.name) branchMap[i.name.toLowerCase().trim()] = i.quantity || 0;
            });

            const branchOptions = branches.map(b => ({
                value: b.id,
                label: `${b.name} (${b.location || 'Branch'})`
            }));

            container.innerHTML = `
            <div class="space-y-6 pb-28 sm:pb-32" id="centralDispatchShell">
                <!-- Header -->
                <div class="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                        <button onclick="sessionStorage.removeItem('bms_central_subview'); sessionStorage.removeItem('bms_central_dispatch_branch'); switchView('central_inventory')" class="p-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl transition-all">
                            <i data-lucide="arrow-left" class="w-5 h-5"></i>
                        </button>
                        <div class="w-11 h-11 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center shrink-0">
                            <i data-lucide="truck" class="w-6 h-6 text-emerald-600 dark:text-emerald-400"></i>
                        </div>
                        <div>
                            <h2 class="text-xl font-black text-gray-900 dark:text-white">${window.t('central_dispatch_hub', 'Central Dispatch Hub')}</h2>
                            <p class="text-xs text-gray-500 dark:text-gray-400 font-medium">${window.t('central_dispatch_sub', 'Batch dispatch stock from Central Warehouse directly to any branch')}</p>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button onclick="window.autoFillLowStockDispatch('${selectedBranchId}')" class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer">
                            <i data-lucide="zap" class="w-4 h-4"></i> ${window.t('auto_fill_low_stock', 'Auto-Fill Low Stock')}
                        </button>
                        <button onclick="window.downloadDispatchCSVTemplate('${selectedBranchId}')" class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-50 text-xs shadow-sm transition-all">
                            <i data-lucide="download" class="w-4 h-4 text-emerald-600"></i> ${window.t('dispatch_csv_template', 'Dispatch CSV Template')}
                        </button>
                        <button onclick="window.importDispatchCSV('${selectedBranchId}')" class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold rounded-xl hover:bg-emerald-100 text-xs transition-all">
                            <i data-lucide="file-up" class="w-4 h-4 text-emerald-600"></i> ${window.t('upload_dispatch_csv', 'Upload Dispatch CSV')}
                        </button>
                    </div>
                </div>

                <!-- Clean Sticky Floating Header: Search & Target Branch Selector (Desktop & Mobile) -->
                <div class="sticky top-0 z-30 pt-0.5 pb-1 sm:pt-1 sm:pb-1.5 justify-center flex">
                    <div class="flex items-center justify-center gap-2 sm:gap-2.5 max-w-xl w-full mx-auto">
                        <!-- Search Input -->
                        <div class="flex-1 relative min-w-0">
                            <i data-lucide="search" class="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 dark:text-gray-500 pointer-events-none"></i>
                            <input type="text" id="dispatchSearchInput" placeholder="${window.t('search_dispatch_items', 'Search by name, SKU, or category...')}" oninput="window.filterDispatchTable(this.value)" class="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 font-medium text-gray-900 dark:text-white rounded-full text-xs sm:text-sm shadow-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 truncate">
                        </div>

                        <!-- Target Branch Selector (Floating Sticky) -->
                        <div class="w-44 sm:w-56 shrink-0">
                            ${window.renderPremiumSelect({
                                id: 'dispatchTargetBranchSelect',
                                options: branchOptions,
                                selectedValue: selectedBranchId,
                                placeholder: 'Target Branch...',
                                classes: 'w-full text-xs sm:text-sm rounded-full border border-gray-300 dark:border-gray-600 font-medium text-gray-900 dark:text-white shadow-sm truncate py-1.5 sm:py-2',
                                onChange: 'window.handleDispatchBranchChange(this.value)'
                            })}
                        </div>
                    </div>
                </div>

                <!-- Dispatch Items — Mobile Cards / Desktop Table -->
                <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">

                    <!-- ▶ Desktop Table (hidden on mobile) -->
                    <div class="hidden sm:block overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th class="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase">Item Details</th>
                                    <th class="text-center px-5 py-3.5 text-xs font-bold text-gray-500 uppercase">Main Store Stock</th>
                                    <th class="text-center px-5 py-3.5 text-xs font-bold text-gray-500 uppercase">Target Branch Stock</th>
                                    <th class="text-center px-5 py-3.5 text-xs font-bold text-gray-500 uppercase">Dispatch Quantity</th>
                                    <th class="text-center px-5 py-3.5 text-xs font-bold text-gray-500 uppercase">Quick Actions</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 dark:divide-gray-700/50" id="dispatchTableBody">
                                ${centralItems.map(item => {
                                    const mainStock = item.main_store_stock || 0;
                                    const branchStock = branchMap[item.id] ?? branchMap[item.sku] ?? branchMap[item.name.toLowerCase().trim()] ?? 0;
                                    const currentDispatchQty = dispatchState[item.id] || 0;
                                    return `
                                    <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors dispatch-row" data-name="${(item.name || '').toLowerCase()}" data-sku="${(item.sku || '').toLowerCase()}" data-category="${(item.category || '').toLowerCase()}">
                                        <td class="px-5 py-4">
                                            <div class="font-bold text-gray-900 dark:text-white text-sm">${item.name}</div>
                                            <div class="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                <span>SKU: ${item.sku || 'N/A'}</span>
                                                <span>•</span>
                                                <span class="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-md font-medium text-gray-600 dark:text-gray-300 text-[10px]">${item.category || 'General'}</span>
                                            </div>
                                        </td>
                                        <td class="px-5 py-4 text-center">
                                            <span class="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl text-xs border border-indigo-100 dark:border-indigo-900">
                                                <i data-lucide="warehouse" class="w-3.5 h-3.5"></i> ${mainStock.toLocaleString()} ${item.unit || ''}
                                            </span>
                                        </td>
                                        <td class="px-5 py-4 text-center">
                                            <span class="inline-flex items-center gap-1 px-3 py-1 ${branchStock <= (item.min_threshold || 5) ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'} font-bold rounded-xl text-xs border">
                                                <i data-lucide="store" class="w-3.5 h-3.5"></i> ${branchStock.toLocaleString()} ${item.unit || ''}
                                            </span>
                                        </td>
                                        <td class="px-5 py-4 text-center">
                                            <div class="inline-flex items-center border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 p-1">
                                                <button onclick="window.adjustDispatchQty('${item.id}', -1, ${mainStock})" class="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-lg transition-colors">
                                                    <i data-lucide="minus" class="w-3.5 h-3.5"></i>
                                                </button>
                                                <input type="number" id="dispatch_input_desktop_${item.id}"
                                                       value="${currentDispatchQty}" min="0" max="${mainStock}"
                                                       onclick="if (this.value == '0') this.value = ''; this.select();"
                                                       onfocus="if (this.value == '0') this.value = ''; this.select();"
                                                       onblur="if (this.value.trim() === '' || isNaN(this.value)) { this.value = '0'; window.setDispatchQty('${item.id}', 0, ${mainStock}); }"
                                                       oninput="window.setDispatchQty('${item.id}', this.value, ${mainStock})"
                                                       class="dispatch-input-${item.id} w-16 text-center bg-transparent font-black text-sm text-gray-900 dark:text-white outline-none">
                                                <button onclick="window.adjustDispatchQty('${item.id}', 1, ${mainStock})" class="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-lg transition-colors">
                                                    <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                                                </button>
                                            </div>
                                        </td>
                                        <td class="px-5 py-4 text-center">
                                            <button onclick="window.setDispatchQty('${item.id}', ${mainStock}, ${mainStock})" class="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-emerald-100 text-gray-700 dark:text-gray-200 hover:text-emerald-700 font-bold rounded-xl text-xs transition-colors">
                                                Max
                                            </button>
                                        </td>
                                    </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>

                    <!-- ▶ Mobile Cards (visible only on mobile) — compact design -->
                    <div class="sm:hidden pb-12" id="dispatchCardList">
                        ${centralItems.map(item => {
                            const mainStock = item.main_store_stock || 0;
                            const branchStock = branchMap[item.id] ?? branchMap[item.sku] ?? branchMap[item.name.toLowerCase().trim()] ?? 0;
                            const currentDispatchQty = dispatchState[item.id] || 0;
                            const isLow = branchStock <= (item.min_threshold || 5);
                            const retailPrice = Number(item.retail_price || item.price || 0);
                            const wholesalePrice = Number(item.wholesale_price || 0);
                            const safeName = (item.name || '').replace(/'/g, "\\'");
                            return `
                            <div class="dispatch-row border-b border-gray-100 dark:border-gray-700/50 px-3 py-2.5"
                                 data-name="${(item.name || '').toLowerCase()}"
                                 data-sku="${(item.sku || '').toLowerCase()}"
                                 data-category="${(item.category || '').toLowerCase()}">

                                <!-- Row 1: Name + Action icons -->
                                <div class="flex items-start justify-between gap-2 mb-1.5">
                                    <div class="min-w-0 flex-1">
                                        <div class="font-bold text-gray-900 dark:text-white text-[13px] leading-tight truncate">${item.name}</div>
                                        <div class="flex items-center gap-1 mt-0.5 flex-wrap">
                                            <span class="text-[9px] text-gray-400 font-mono">${item.sku || 'N/A'}</span>
                                            <span class="text-gray-300 dark:text-gray-600 text-[9px]">•</span>
                                            <span class="text-[9px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-px rounded font-medium">${item.category || 'General'}</span>
                                            ${item.unit ? `<span class="text-[9px] text-gray-400">· ${item.unit}</span>` : ''}
                                            ${isLow ? `<span class="text-[9px] text-red-500 font-bold">⚠ Low</span>` : ''}
                                        </div>
                                    </div>
                                    <!-- Actions: Edit + Delete -->
                                    <div class="flex items-center gap-1 shrink-0">
                                        <button onclick="window.openEditCentralItemModal('${item.id}')"
                                                class="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 active:bg-amber-100 transition-colors border border-amber-100 dark:border-amber-900/50">
                                            <i data-lucide="pencil" class="w-3 h-3"></i>
                                        </button>
                                        <button onclick="window.deleteSingleCentralItem('${item.id}', '${safeName}')"
                                                class="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 active:bg-red-100 transition-colors border border-red-100 dark:border-red-900/50">
                                            <i data-lucide="trash-2" class="w-3 h-3"></i>
                                        </button>
                                    </div>
                                </div>

                                <!-- Row 2: Stock + Price chips -->
                                <div class="flex items-center gap-1.5 mb-2 flex-wrap">
                                    <!-- Main Store Stock -->
                                    <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded text-[10px] font-bold border border-indigo-100 dark:border-indigo-900/50">
                                        <i data-lucide="warehouse" class="w-2.5 h-2.5"></i>
                                        ${mainStock.toLocaleString()}
                                    </span>
                                    <!-- Branch Stock -->
                                    <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 ${isLow ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/50'} rounded text-[10px] font-bold border">
                                        <i data-lucide="store" class="w-2.5 h-2.5"></i>
                                        ${branchStock.toLocaleString()}
                                    </span>
                                    <span class="text-gray-200 dark:text-gray-700 text-[10px]">|</span>
                                    <!-- Retail Price -->
                                    <span class="inline-flex items-center gap-0.5 text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">R:</span>
                                    <span class="text-[10px] font-bold text-gray-800 dark:text-gray-200">${retailPrice > 0 ? window.fmt.currency(retailPrice) : '—'}</span>
                                    <!-- Wholesale Price -->
                                    <span class="inline-flex items-center gap-0.5 text-[9px] font-bold text-teal-500 uppercase tracking-wide">W:</span>
                                    <span class="text-[10px] font-bold text-teal-700 dark:text-teal-400">${wholesalePrice > 0 ? window.fmt.currency(wholesalePrice) : '—'}</span>
                                </div>

                                <!-- Row 3: Dispatch stepper + quick dispatch btn -->
                                <div class="flex items-center gap-1.5">
                                    <!-- −/qty/+ stepper -->
                                    <div class="flex items-center border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 overflow-hidden h-7">
                                        <button onclick="window.adjustDispatchQty('${item.id}', -1, ${mainStock})"
                                                class="w-7 h-7 flex items-center justify-center bg-white dark:bg-gray-800 active:bg-gray-100 text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600 transition-colors text-sm font-bold">
                                            <i data-lucide="minus" class="w-3 h-3"></i>
                                        </button>
                                        <input type="number" id="dispatch_input_mobile_${item.id}"
                                               value="${currentDispatchQty}" min="0" max="${mainStock}"
                                               onclick="if (this.value == '0') this.value = ''; this.select();"
                                               onfocus="if (this.value == '0') this.value = ''; this.select();"
                                               onblur="if (this.value.trim() === '' || isNaN(this.value)) { this.value = '0'; window.setDispatchQty('${item.id}', 0, ${mainStock}); }"
                                               oninput="window.setDispatchQty('${item.id}', this.value, ${mainStock})"
                                               class="dispatch-input-${item.id} w-10 text-center bg-transparent font-black text-xs text-gray-900 dark:text-white outline-none py-0 h-7 min-w-0"
                                               style="appearance:textfield;-moz-appearance:textfield;">
                                        <button onclick="window.adjustDispatchQty('${item.id}', 1, ${mainStock})"
                                                class="w-7 h-7 flex items-center justify-center bg-white dark:bg-gray-800 active:bg-gray-100 text-gray-600 dark:text-gray-300 border-l border-gray-200 dark:border-gray-600 transition-colors text-sm font-bold">
                                            <i data-lucide="plus" class="w-3 h-3"></i>
                                        </button>
                                    </div>
                                    <!-- Max btn -->
                                    <button onclick="window.setDispatchQty('${item.id}', ${mainStock}, ${mainStock})"
                                            class="h-7 px-2 text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-600 active:bg-gray-200 transition-colors shrink-0">
                                        Max
                                    </button>
                                    <!-- Quick single dispatch -->
                                    <button onclick="window.openDispatchModal('${item.id}', '${safeName}', ${mainStock})"
                                            class="ml-auto h-7 px-2 flex items-center gap-1 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-100 dark:border-emerald-800 active:bg-emerald-100 transition-colors shrink-0">
                                        <i data-lucide="send" class="w-2.5 h-2.5"></i>
                                        Dispatch
                                    </button>
                                </div>
                            </div>
                            `;
                        }).join('')}
                    </div>

                </div>


                <!-- Batch Dispatch Footer — fixed within main content area (offsetting desktop sidebar) and center-aligned -->
                <div class="fixed bottom-0 left-0 md:left-64 right-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 py-2.5 shadow-lg">
                    <div class="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-center gap-3.5 sm:gap-6">
                        <div class="flex items-center gap-1.5 shrink-0">
                            <i data-lucide="package" class="w-3.5 h-3.5 text-gray-400 shrink-0"></i>
                            <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Batch:</span>
                            <span id="dispatchItemCountSummary" class="text-xs font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">0 items</span>
                            <span class="text-gray-300 dark:text-gray-600 text-xs">·</span>
                            <span id="dispatchQtyTotalSummary" class="text-xs font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">0 units</span>
                        </div>
                        <button onclick="window.executeBatchDispatch('${selectedBranchId}')" id="btnExecuteBatchDispatch"
                                class="h-8 px-4 flex items-center gap-1.5 text-xs font-bold bg-gray-800 dark:bg-gray-700 text-white rounded-xl border border-gray-700 dark:border-gray-600 active:bg-gray-900 disabled:opacity-40 transition-all shrink-0 shadow-xs">
                            <i data-lucide="send" class="w-3.5 h-3.5"></i>
                            ${window.t('dispatch', 'Dispatch')}
                        </button>
                    </div>
                </div>
            </div>
            `;

            if (window.lucide) window.lucide.createIcons();
            window.updateDispatchSummaryUI();
        };

        window.handleDispatchBranchChange = (branchId) => {
            dispatchState = {};
            selectedBranchId = branchId;
            sessionStorage.setItem('bms_central_dispatch_branch', branchId);
            renderDispatchPage();
        };

        window.adjustDispatchQty = (itemId, delta, maxStock) => {
            const current = dispatchState[itemId] || 0;
            const next = Math.max(0, Math.min(maxStock, current + delta));
            dispatchState[itemId] = next;
            document.querySelectorAll(`.dispatch-input-${itemId}`).forEach(input => {
                input.value = next;
            });
            window.updateDispatchSummaryUI();
        };

        window.setDispatchQty = (itemId, val, maxStock) => {
            const isBlank = val === '' || val === null || val === undefined;
            const parsed = parseInt(val) || 0;
            const next = Math.max(0, Math.min(maxStock, parsed));
            dispatchState[itemId] = next;
            document.querySelectorAll(`.dispatch-input-${itemId}`).forEach(input => {
                if (document.activeElement === input) {
                    if (isBlank) return;
                    if (parsed > maxStock) input.value = next;
                    return;
                }
                input.value = isBlank ? '' : next;
            });
            window.updateDispatchSummaryUI();
        };

        window.filterDispatchTable = (query) => {
            const q = (query || '').toLowerCase().trim();
            // Filters both desktop table rows and mobile cards (both share .dispatch-row + data attributes)
            document.querySelectorAll('.dispatch-row').forEach(row => {
                const name = row.dataset.name || '';
                const sku = row.dataset.sku || '';
                const cat = row.dataset.category || '';
                if (!q || name.includes(q) || sku.includes(q) || cat.includes(q)) {
                    row.classList.remove('hidden');
                } else {
                    row.classList.add('hidden');
                }
            });
        };

        window.updateDispatchSummaryUI = () => {
            let activeItems = 0;
            let totalQty = 0;
            Object.values(dispatchState).forEach(q => {
                if (q > 0) {
                    activeItems++;
                    totalQty += q;
                }
            });
            const countEl = document.getElementById('dispatchItemCountSummary');
            const qtyEl = document.getElementById('dispatchQtyTotalSummary');
            if (countEl) countEl.textContent = `${activeItems} items`;
            if (qtyEl) qtyEl.textContent = `${totalQty.toLocaleString()} units`;
        };

        window.autoFillLowStockDispatch = async (branchId) => {
            const targetBranchInvRes = await dbInventory.fetchAll(branchId, { pageSize: 10000 });
            const targetItems = targetBranchInvRes.items || [];
            let filledCount = 0;

            centralItems.forEach(cItem => {
                const match = targetItems.find(t => t.central_item_id === cItem.id || t.sku === cItem.sku);
                const currentBranchStock = match ? (match.quantity || 0) : 0;
                const threshold = match ? (match.min_threshold || 5) : 5;

                if (currentBranchStock <= threshold && cItem.main_store_stock > 0) {
                    const needed = Math.max(10, (threshold * 3) - currentBranchStock);
                    const dispatchQty = Math.min(cItem.main_store_stock, needed);
                    dispatchState[cItem.id] = dispatchQty;
                    document.querySelectorAll(`.dispatch-input-${cItem.id}`).forEach(input => {
                        input.value = dispatchQty;
                    });
                    filledCount++;
                }
            });

            window.updateDispatchSummaryUI();
            if (filledCount > 0) {
                window.showToast(`Auto-filled ${filledCount} low stock items!`, 'success');
            } else {
                window.showToast('No low stock items need restocking for this branch.', 'info');
            }
        };

        window.executeBatchDispatch = async (branchId) => {
            const itemsToDispatch = Object.entries(dispatchState).filter(([_, qty]) => qty > 0);

            if (itemsToDispatch.length === 0) {
                window.showToast('Please enter a dispatch quantity for at least one item.', 'warning');
                return;
            }

            const confirmed = await window.confirmModal(
                'Confirm Batch Dispatch',
                `Are you sure you want to dispatch ${itemsToDispatch.length} items to the selected branch?`,
                'Yes, Dispatch Now',
                'Cancel'
            );

            if (!confirmed) return;

            window.showLoader(`Dispatching ${itemsToDispatch.length} items to branch...`);

            let success = 0;
            let failed = 0;

            for (const [cItemId, qty] of itemsToDispatch) {
                try {
                    await dbCentralInventory.dispatchStock(cItemId, branchId, qty, 'Batch dispatched via Central Dispatch Hub');
                    success++;
                } catch (err) {
                    console.error('[BatchDispatch] Error for item:', cItemId, err);
                    failed++;
                }
            }

            window.hideLoader();

            if (success > 0) {
                window.showToast(`Successfully dispatched ${success} items! (${failed} failed)`, 'success');
                dispatchState = {};
                renderDispatchPage();
            } else {
                window.showToast('Failed to execute batch dispatch. Please try again.', 'error');
            }
        };

        window.downloadDispatchCSVTemplate = (branchId) => {
            const headers = ['sku', 'item_name', 'target_branch_id', 'available_main_store_stock', 'dispatch_quantity'];
            const instructions = [
                "CENTRAL DISPATCH CSV IMPORT INSTRUCTIONS:",
                "Fill in 'dispatch_quantity' for items you wish to dispatch to the branch.",
                "Leave 'dispatch_quantity' as 0 or blank for items you do not want to dispatch.",
                "DO NOT DELETE OR MODIFY THE HEADER NAMES OR THIS RIGHT-HAND INSTRUCTION COLUMN.",
                "COLUMN GUIDE:",
                "• sku: Barcode / SKU / Item Code",
                "• item_name: Product Name",
                "• target_branch_id: Destination Branch ID",
                "• available_main_store_stock: Stock available in Main Store",
                "• dispatch_quantity: Quantity to dispatch to branch"
            ];
            const sampleRows = centralItems.map(i => [
                i.sku || '',
                i.name,
                branchId,
                i.main_store_stock || 0,
                '0'
            ]);

            downloadCSVTemplate('central_dispatch_template.csv', headers, instructions, sampleRows);
        };

        window.importDispatchCSV = (branchId) => {
            triggerCSVUpload(async (data) => {
                if (!data || data.length === 0) {
                    showToast('CSV is empty or invalid', 'error');
                    return;
                }

                let count = 0;
                data.forEach(row => {
                    const getVal = (...keys) => {
                        for (const k of keys) {
                            const targetKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                            const foundKey = Object.keys(row).find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === targetKey);
                            if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) return String(row[foundKey]).trim();
                        }
                        return null;
                    };

                    const sku = getVal('sku', 'code');
                    const name = getVal('item_name', 'itemname', 'name');
                    const dispatchQty = fmt.parseNumber(getVal('dispatch_quantity', 'dispatchquantity', 'qty') || 0);

                    if (dispatchQty > 0) {
                        const match = centralItems.find(ci => (sku && ci.sku === sku) || (name && ci.name.toLowerCase().trim() === name.toLowerCase().trim()));
                        if (match) {
                            dispatchState[match.id] = Math.min(match.main_store_stock, dispatchQty);
                            count++;
                        }
                    }
                });

                if (count > 0) {
                    showToast(`Loaded ${count} dispatch items from CSV! Click 'Confirm & Dispatch Batch' to execute.`, 'success');
                    renderDispatchPage();
                } else {
                    showToast('No valid dispatch quantities found in CSV.', 'warning');
                }
            });
        };

        await renderDispatchPage();
        window.hideLoader();
    } catch (err) {
        window.hideLoader();
        window.showToast('Error opening Central Dispatch: ' + err.message, 'error');
    }
};
