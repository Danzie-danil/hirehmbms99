
import { dbSuppliers, dbBranches, dbInventory, dbCentralInventory, dbCapital, dbTasks, dbStockMovements, supabase, getLocalItems } from '../db.js';
import './stock_sheet_engine.js';


window.openCentralItemModal = async function(preselectType) {
    const activeTab = window.state?._inventoryActiveTab || 'inventory';
    const isService = (preselectType === 'service') || (activeTab === 'services');
    const modalKey = isService ? 'addService' : 'addStock';

    try {
        sessionStorage.setItem('bms_active_modal', JSON.stringify({
            type: 'openCentralItemModal',
            data: { preselectType: isService ? 'service' : 'inventory', isService },
            viewId: 'central_inventory',
            context: isService ? 'services' : 'inventory'
        }));
    } catch (e) {}

    const [suppliers, capitalAccounts, categories] = await Promise.all([
        dbSuppliers.fetchAll(state.ownerId).catch(() => []),
        dbCapital.fetchAccounts(state.ownerId).catch(() => []),
        window.dbCategories ? window.dbCategories.fetchAll(state.ownerId, isService ? 'service' : 'product').catch(() => []) : []
    ]);

    const modalTitle = isService ? 'Register New Service / Offering' : window.t('add_stock_item', 'Add Stock Item');
    const submitBtnText = isService ? 'Save Service' : window.t('save_item', 'Save Stock Item');

    const modalHtml = `
        <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
            <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                <i data-lucide="chevron-left" class="w-4 h-4"></i><span>${window.t('back', 'Back')}</span>
            </button>
            <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-xl ${isService ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400' : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'} flex items-center justify-center">
                    <i data-lucide="${isService ? 'wrench' : 'package-plus'}" class="w-4 h-4"></i>
                </div>
                <h3 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white" id="ciModalHeaderTitle">${modalTitle}</h3>
            </div>
            <button type="button" onclick="window.askStockAssistant()" class="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#475B6E]/10 hover:bg-[#475B6E]/20 text-[#475B6E] font-bold rounded-xl text-xs transition-all border border-[#475B6E]/20 shadow-xs">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-[#475B6E]"></i> ${window.t('ask_assistant', 'Ask')}
            </button>
        </div>
        <form onsubmit="window.saveCentralItem(event)" class="flex flex-col flex-1 overflow-hidden">
            <div class="flex-1 overflow-y-auto p-6 space-y-6">
                <!-- Bulk Import Option -->
                <div class="${isService ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-100 dark:border-purple-900/60' : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/60'} border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" id="ciBulkImportBox">
                    <div>
                        <h4 class="text-sm font-bold ${isService ? 'text-purple-900 dark:text-purple-200' : 'text-indigo-900 dark:text-indigo-200'} flex items-center gap-2" id="ciBulkImportTitle">
                            <i data-lucide="sparkles" class="w-4 h-4"></i> ${isService ? 'Bulk Add Services' : window.t('import_csv', 'Bulk Add Items')}
                        </h4>
                        <p class="text-xs ${isService ? 'text-purple-700 dark:text-purple-300' : 'text-indigo-700 dark:text-indigo-300'} mt-1" id="ciBulkImportDesc">
                            ${isService ? 'Got many service offerings? Upload your CSV or Excel (.xlsx / .xls) spreadsheet all at once.' : 'Got many items? Upload your CSV or Excel (.xlsx / .xls) spreadsheet all at once.'}
                        </p>
                    </div>
                    <div class="flex gap-2 w-full sm:w-auto" id="ciBulkImportActions">
                        ${isService ? `
                        <button type="button" onclick="window.downloadServicesCSVTemplate()" class="flex-1 sm:flex-none px-3 py-2 bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 font-bold text-xs rounded-xl border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors flex items-center justify-center gap-1.5">
                            <i data-lucide="download" class="w-3.5 h-3.5"></i> Template
                        </button>
                        <button type="button" onclick="window.importServicesCSV(); closeModal()" class="flex-1 sm:flex-none px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5">
                            <i data-lucide="upload" class="w-3.5 h-3.5"></i> Upload File
                        </button>
                        ` : `
                        <button type="button" onclick="window.downloadCentralCSVTemplate()" class="flex-1 sm:flex-none px-3 py-2 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors flex items-center justify-center gap-1.5">
                            <i data-lucide="download" class="w-3.5 h-3.5"></i> Template
                        </button>
                        <button type="button" onclick="window.importCentralCSV(); closeModal()" class="flex-1 sm:flex-none px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5">
                            <i data-lucide="upload" class="w-3.5 h-3.5"></i> Upload File
                        </button>
                        `}
                    </div>
                </div>

                <!-- Item Type Segmented Switcher -->
                <div class="mb-4">
                    <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Item Type</label>
                    <div class="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <label class="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-all has-[:checked]:bg-white dark:has-[:checked]:bg-gray-700 has-[:checked]:text-indigo-600 has-[:checked]:shadow-xs text-gray-600 dark:text-gray-400">
                            <input type="radio" name="ciItemType" value="product" ${isService ? '' : 'checked'} onchange="window.toggleCentralItemType('product')" class="sr-only">
                            <i data-lucide="package" class="w-4 h-4"></i>
                            <span>📦 Physical Product</span>
                        </label>
                        <label class="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-all has-[:checked]:bg-white dark:has-[:checked]:bg-gray-700 has-[:checked]:text-purple-600 has-[:checked]:shadow-xs text-gray-600 dark:text-gray-400">
                            <input type="radio" name="ciItemType" value="service" ${isService ? 'checked' : ''} onchange="window.toggleCentralItemType('service')" class="sr-only">
                            <i data-lucide="wrench" class="w-4 h-4"></i>
                            <span>🛠️ Service / Offering</span>
                        </label>
                    </div>
                </div>

                <!-- Basic Details -->
                <div>
                    <h4 class="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3" id="ciBasicDetailsHeader">${isService ? 'Service & Financial Details' : window.t('basic_financial_details', 'Basic & Financial Details')}</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1" id="ciNameLabel">${isService ? 'Service Name *' : `${window.t('item_name', 'Item Name')} *`}</label>
                            <input type="text" id="ciName" required placeholder="${isService ? 'e.g. Document Audit / Legal Registration' : window.t('eg_item', 'e.g. Brake Pads')}" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                        </div>
                        <div id="ciSkuContainer" class="${isService ? 'hidden' : ''}">
                            <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('sku_code', 'SKU / Code')}</label>
                            <div class="flex gap-2">
                                <input type="text" id="ciSku" placeholder="Auto-generated if blank" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                                <button type="button" onclick="window.autoFillSKU('ciCategory', 'ciName', 'ciSku')" class="px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-xl text-xs flex items-center gap-1 shrink-0 border border-indigo-200 transition-colors" title="Auto-generate Barcode SKU">
                                    <i data-lucide="wand-2" class="w-4 h-4"></i> Auto
                                </button>
                            </div>
                        </div>
                        <div id="ciCategoryWrapper">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${window.t('category', 'Category')} *</label>
                            ${window.renderPremiumCategorySelect ? window.renderPremiumCategorySelect({
                                id: 'ciCategory',
                                categories,
                                selectedValue: '',
                                itemType: isService ? 'service' : 'product',
                                placeholder: isService ? 'Select or type service category...' : 'Select or type category...'
                            }) : `<input type="text" id="ciCategory" required placeholder="${isService ? 'e.g. Consulting, Printing, Repairs' : 'e.g. Electronics, Stationery'}" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">`}
                        </div>
                        <div id="ciMainStoreStockContainer" class="${isService ? 'hidden' : ''}">
                            <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('initial_stock', 'Initial Main Store Stock')} *</label>
                            <input type="text" inputmode="decimal" id="ciMainStoreStock" placeholder="e.g. 1,000" ${isService ? '' : 'required'} oninput="window.calcCentralFinancials()" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-indigo-600 number-format">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="ciSellingPricesLabel">${isService ? 'Service Price (Amount Charged to Customer) *' : `${window.t('selling_prices', 'Selling Prices')} *`}</label>
                            <div class="grid grid-cols-2 gap-2" id="ciPricesGrid">
                                <div id="ciWholesaleContainer" class="${isService ? 'hidden' : ''}">
                                    <span class="block text-[9px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5" id="ciWholesaleLabel">${window.t('wholesale', 'Wholesale')}</span>
                                    <input type="text" inputmode="decimal" id="ciWholesalePrice" ${isService ? '' : 'required'} placeholder="e.g. 28,000" oninput="window.calcCentralFinancials()" class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600 number-format">
                                </div>
                                <div id="ciRetailContainer" class="${isService ? 'col-span-2' : ''}">
                                    <span class="block text-[9px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5" id="ciRetailLabel">${isService ? 'Customer Fee / Selling Rate' : window.t('retail', 'Retail')}</span>
                                    <input type="text" inputmode="decimal" id="ciRetailPrice" required placeholder="${isService ? 'e.g. 50,000' : 'e.g. 30,000'}" oninput="window.calcCentralFinancials()" class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-emerald-600 number-format">
                                </div>
                            </div>
                        </div>
                        <div id="ciCostPriceContainer">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="ciCostPriceLabel">${isService ? 'Direct Service Cost / Expenses (Optional)' : `${window.t('purchase_price', 'Purchase Price per Item (Cost)')} *`}</label>
                            <input type="text" inputmode="decimal" id="ciCostPrice" ${isService ? '' : 'required'} placeholder="0.00" oninput="window.calcCentralFinancials()" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-amber-600 number-format">
                            <p id="ciCostPriceHelp" class="text-[10px] text-gray-400 mt-1 ${isService ? '' : 'hidden'}">Estimated direct cost/supplies to deliver this service (leave 0.00 if pure labor).</p>
                        </div>
                        <div id="ciThresholdContainer" class="${isService ? 'hidden' : ''}">
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
                            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-tight">${isService ? 'Standard Service Revenue' : window.t('expected_sales_return', 'Expected Sales Value')}</p>
                            <p id="calcExpectedSales" class="text-xs sm:text-sm font-black text-emerald-600 whitespace-nowrap">TZS 0</p>
                        </div>
                        <div class="bg-white px-3 py-1.5 rounded-xl border border-slate-200/70 shadow-xs flex items-center justify-between gap-4">
                            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-tight">${isService ? 'Direct Expense / Cost Basis' : window.t('total_cost', 'Total Cost')}</p>
                            <p id="calcTotalCost" class="text-xs sm:text-sm font-black text-amber-600 whitespace-nowrap">TZS 0</p>
                        </div>
                        <div class="bg-white px-3 py-1.5 rounded-xl border border-slate-200/70 shadow-xs flex items-center justify-between gap-4">
                            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-tight">${isService ? 'Net Service Profit Margin' : window.t('potential_profit', 'Potential Gross Profit')}</p>
                            <p id="calcPotentialProfit" class="text-xs sm:text-sm font-black text-[#475B6E] whitespace-nowrap">TZS 0</p>
                        </div>
                    </div>
                </div>

                <!-- Supplier & Funding Capital Source -->
                <div>
                    <h4 class="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3" id="ciSupplierFundingHeader">${isService ? 'Funding & Capital Source' : window.t('supplier_details', 'Supplier & Funding Source')}</h4>
                    <div class="grid grid-cols-1 ${isService ? '' : 'sm:grid-cols-2'} gap-4">
                        <div id="ciSupplierContainer" class="${isService ? 'hidden' : ''}">
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
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Funding Capital Source</label>
                            ${window.renderPremiumSelect ? window.renderPremiumSelect({
                                id: 'ciCapitalSource',
                                selectedValue: '',
                                searchable: capitalAccounts.length > 4,
                                options: [
                                    { value: '', label: 'Unlinked (No Capital Deduction)', icon: 'minus-circle' },
                                    { value: 'external', label: '🌐 External Capital / Third-Party Source', icon: 'globe' },
                                    ...capitalAccounts.map(c => ({ value: c.id, label: `${c.account_name} (${window.fmt.currency(c.balance || 0)})`, icon: 'wallet' }))
                                ]
                            }) : ''}
                        </div>
                    </div>
                    <div class="mt-3">
                        <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('description', 'Description')}</label>
                        <textarea id="ciDescription" rows="2" placeholder="${isService ? 'e.g. Service terms, deliverables, or execution notes' : 'Item description or notes'}" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"></textarea>
                    </div>
                </div>
            </div>
            <div class="p-3 sm:p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-2.5 sm:gap-4 bg-gray-50/80 dark:bg-gray-900/80 mt-auto flex-shrink-0">
                <button type="button" onclick="closeModal()" class="px-3.5 py-1.5 sm:px-6 sm:py-2.5 font-bold rounded-xl transition-all text-xs sm:text-sm bg-red-600 text-white hover:bg-red-700 shadow-sm border-none min-w-[85px] sm:min-w-[140px] flex items-center justify-center">${window.t('cancel', 'Cancel')}</button>
                <button type="submit" id="ciSubmitBtn" class="px-3.5 py-1.5 sm:px-6 sm:py-2.5 ${isService ? 'bg-purple-600 hover:bg-purple-700' : 'bg-[#475B6E] hover:bg-[#394a5a]'} text-white font-bold rounded-xl shadow-md transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 min-w-[110px] sm:min-w-[180px]">
                    <i data-lucide="plus" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> <span id="ciSubmitBtnText">${submitBtnText}</span>
                </button>
            </div>
        </form>
    `;

    openModal(modalHtml, { preselectType, isService }, false, modalKey);
    setTimeout(() => {
        if (typeof window.calcCentralFinancials === 'function') window.calcCentralFinancials();
    }, 50);
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

window.toggleCentralItemType = async function(type) {
    const isService = type === 'service';
    const mainStoreStockContainer = document.getElementById('ciMainStoreStockContainer');
    const thresholdContainer = document.getElementById('ciThresholdContainer');
    const basicDetailsHeader = document.getElementById('ciBasicDetailsHeader');
    const costPriceLabel = document.getElementById('ciCostPriceLabel');
    const costPriceHelp = document.getElementById('ciCostPriceHelp');
    const sellingPricesLabel = document.getElementById('ciSellingPricesLabel');
    const wholesaleContainer = document.getElementById('ciWholesaleContainer');
    const wholesaleInput = document.getElementById('ciWholesalePrice');
    const retailContainer = document.getElementById('ciRetailContainer');
    const retailLabel = document.getElementById('ciRetailLabel');
    const supplierContainer = document.getElementById('ciSupplierContainer');
    const supplierFundingHeader = document.getElementById('ciSupplierFundingHeader');
    const submitBtn = document.getElementById('ciSubmitBtn');
    const submitBtnText = document.getElementById('ciSubmitBtnText');
    const modalHeaderTitle = document.getElementById('ciModalHeaderTitle');
    const bulkImportBox = document.getElementById('ciBulkImportBox');
    const nameLabel = document.getElementById('ciNameLabel');

    const skuContainer = document.getElementById('ciSkuContainer');
    if (skuContainer) skuContainer.classList.toggle('hidden', isService);
    if (mainStoreStockContainer) mainStoreStockContainer.classList.toggle('hidden', isService);
    if (thresholdContainer) thresholdContainer.classList.toggle('hidden', isService);
    if (supplierContainer) supplierContainer.classList.toggle('hidden', isService);
    if (bulkImportBox) {
        bulkImportBox.className = isService
            ? 'bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'
            : 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4';

        const title = document.getElementById('ciBulkImportTitle');
        const desc = document.getElementById('ciBulkImportDesc');
        const actions = document.getElementById('ciBulkImportActions');

        if (title) {
            title.innerHTML = `<i data-lucide="sparkles" class="w-4 h-4"></i> ${isService ? 'Bulk Add Services' : window.t('import_csv', 'Bulk Add Items')}`;
            title.className = `text-sm font-bold ${isService ? 'text-purple-900 dark:text-purple-200' : 'text-indigo-900 dark:text-indigo-200'} flex items-center gap-2`;
        }
        if (desc) {
            desc.textContent = isService
                ? 'Got many service offerings? Upload your CSV or Excel (.xlsx / .xls) spreadsheet all at once.'
                : 'Got many items? Upload your CSV or Excel (.xlsx / .xls) spreadsheet all at once.';
            desc.className = `text-xs ${isService ? 'text-purple-700 dark:text-purple-300' : 'text-indigo-700 dark:text-indigo-300'} mt-1`;
        }
        if (actions) {
            actions.innerHTML = isService ? `
                <button type="button" onclick="window.downloadServicesCSVTemplate()" class="flex-1 sm:flex-none px-3 py-2 bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 font-bold text-xs rounded-xl border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors flex items-center justify-center gap-1.5">
                    <i data-lucide="download" class="w-3.5 h-3.5"></i> Template
                </button>
                <button type="button" onclick="window.importServicesCSV(); closeModal()" class="flex-1 sm:flex-none px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5">
                    <i data-lucide="upload" class="w-3.5 h-3.5"></i> Upload File
                </button>
            ` : `
                <button type="button" onclick="window.downloadCentralCSVTemplate()" class="flex-1 sm:flex-none px-3 py-2 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors flex items-center justify-center gap-1.5">
                    <i data-lucide="download" class="w-3.5 h-3.5"></i> Template
                </button>
                <button type="button" onclick="window.importCentralCSV(); closeModal()" class="flex-1 sm:flex-none px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5">
                    <i data-lucide="upload" class="w-3.5 h-3.5"></i> Upload File
                </button>
            `;
        }
        if (window.lucide) window.lucide.createIcons({ scope: bulkImportBox });
    }
    if (wholesaleContainer) wholesaleContainer.classList.toggle('hidden', isService);
    if (wholesaleInput) wholesaleInput.required = !isService;
    if (retailContainer) {
        retailContainer.className = isService ? 'col-span-2' : '';
    }
    if (costPriceHelp) costPriceHelp.classList.toggle('hidden', !isService);

    if (modalHeaderTitle) {
        modalHeaderTitle.textContent = isService ? 'Register New Service / Offering' : window.t('add_stock_item', 'Add Stock Item');
    }
    if (submitBtnText) {
        submitBtnText.textContent = isService ? 'Save Service' : window.t('save_item', 'Save Stock Item');
    }
    if (submitBtn) {
        submitBtn.className = `px-3.5 py-1.5 sm:px-6 sm:py-2.5 ${isService ? 'bg-purple-600 hover:bg-purple-700' : 'bg-[#475B6E] hover:bg-[#394a5a]'} text-white font-bold rounded-xl shadow-md transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 min-w-[110px] sm:min-w-[180px]`;
    }
    if (nameLabel) {
        nameLabel.textContent = isService ? 'Service Name *' : `${window.t('item_name', 'Item Name')} *`;
    }
    if (basicDetailsHeader) {
        basicDetailsHeader.textContent = isService ? 'Service & Financial Details' : window.t('basic_financial_details', 'Basic & Financial Details');
    }
    if (supplierFundingHeader) {
        supplierFundingHeader.textContent = isService ? 'Funding & Capital Source' : window.t('supplier_details', 'Supplier & Funding Source');
    }
    if (costPriceLabel) {
        costPriceLabel.textContent = isService ? 'Direct Service Cost / Expenses (Optional)' : `${window.t('purchase_price', 'Purchase Price per Item (Cost)')} *`;
    }
    const costInput = document.getElementById('ciCostPrice');
    if (costInput) {
        costInput.placeholder = '0.00';
        costInput.required = !isService;
    }
    if (sellingPricesLabel) {
        sellingPricesLabel.textContent = isService ? 'Service Price (Amount Charged to Customer) *' : `${window.t('selling_prices', 'Selling Prices')} *`;
    }
    if (retailLabel) {
        retailLabel.textContent = isService ? 'Customer Fee / Selling Rate' : window.t('retail', 'Retail');
    }

    const stockInput = document.getElementById('ciMainStoreStock');
    if (stockInput) stockInput.required = !isService;

    // Reload strictly isolated categories for selected type
    const catWrapper = document.getElementById('ciCategoryWrapper');
    if (catWrapper && window.dbCategories && state.ownerId && window.renderPremiumCategorySelect) {
        try {
            const freshCats = await window.dbCategories.fetchAll(state.ownerId, isService ? 'service' : 'product');
            catWrapper.innerHTML = `
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${window.t('category', 'Category')} *</label>
                ${window.renderPremiumCategorySelect({
                    id: 'ciCategory',
                    categories: freshCats,
                    selectedValue: '',
                    itemType: isService ? 'service' : 'product',
                    placeholder: isService ? 'Select or type service category...' : 'Select or type category...'
                })}
            `;
            if (window.lucide) window.lucide.createIcons({ scope: catWrapper });
        } catch (e) {
            console.warn('[setItemType] Category reload warning:', e);
        }
    }

    window.calcCentralFinancials();
};

window.calcCentralFinancials = function() {
    const itemType = document.querySelector('input[name="ciItemType"]:checked')?.value || 'product';
    const isService = itemType === 'service';

    const qty = isService ? 1 : window.fmt.parseNumber(document.getElementById('ciMainStoreStock')?.value || 0);
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

    const itemType = document.querySelector('input[name="ciItemType"]:checked')?.value || 'product';
    const isService = itemType === 'service';

    const costPrice = window.fmt.parseNumber(document.getElementById('ciCostPrice')?.value || 0);
    const retailPrice = window.fmt.parseNumber(document.getElementById('ciRetailPrice')?.value || 0);
    const wholesalePrice = isService ? retailPrice : window.fmt.parseNumber(document.getElementById('ciWholesalePrice')?.value || 0);
    const mainStoreStockInput = document.getElementById('ciMainStoreStock')?.value;
    const mainStoreStock = (!isService && mainStoreStockInput) ? window.fmt.parseNumber(mainStoreStockInput) : 0;
    const thresholdInput = document.getElementById('ciThreshold')?.value;
    const minThreshold = (!isService && thresholdInput) ? window.fmt.parseNumber(thresholdInput) : (isService ? 0 : 5);

    const name = document.getElementById('ciName').value;
    const category = document.getElementById('ciCategory').value;
    const sku = isService ? (document.getElementById('ciSku')?.value?.trim() || `SRV-${Date.now().toString().slice(-6)}`) : (document.getElementById('ciSku')?.value?.trim() || window.generateAutoSKU(category, name));

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
        item_type: itemType,
        supplier_id: isService ? null : (document.getElementById('ciSupplier')?.value || null),
        description: document.getElementById('ciDescription')?.value || null
    };

    try {
        window.showLoader(isService ? 'Registering service in Central Catalog...' : 'Registering stock item in Central Inventory...');

        if (category && window.dbCategories && state.ownerId) {
            window.dbCategories.ensureCategory(state.ownerId, category, itemType).catch(() => {});
        }

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
            item_type: itemType,
            central_item_id: centralItem.id,
            is_from_main_store: true
        };

        if (branches && branches.length > 0) {
            await Promise.all(branches.map(b => dbInventory.add(b.id, branchPayload)));
        }

        const capitalAccountId = document.getElementById('ciCapitalSource')?.value;
        const totalPurchaseValuation = mainStoreStock * costPrice;
        if (!isService && capitalAccountId && totalPurchaseValuation > 0) {
            await dbCapital.adjustBalance(capitalAccountId, -totalPurchaseValuation, {
                notes: `Central Inventory Stock Purchase: ${name} (${mainStoreStock} units @ TZS ${costPrice})`
            });
        }

        window.hideLoader();
        if (window.clearFormDraft) window.clearFormDraft(isService ? 'addService' : 'addStock');
        try { sessionStorage.removeItem('bms_active_modal'); } catch (e) {}
        window.closeCentralItemModal();
        window.showToast(isService ? 'Service registered successfully in Central Catalog!' : 'Stock item registered successfully in Central Inventory!', 'success');
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
        await dbTasks.add(branchId, {
            title: `Restock Required: ${itemName}`,
            description: `Stock level is critically low for "${itemName}". Please request a restock via the Purchase Orders or Stock Transfers module.`,
            priority: 'urgent'
        });
        showToast(`Alert sent to ${branchName}!`, 'success');
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }

};

window.setInventoryActiveTab = function(tab) {
    window.state._inventoryActiveTab = tab;
    try { sessionStorage.setItem('bms_inventory_active_tab', tab); } catch (e) {}
    window.state._invSearch = '';
    window.state._invStatusFilter = 'all';
    window.centralInventoryPageState.page = 1;
    window.centralInventoryPageState.modalPage = 1;
    window.selectedCentralItemIds.clear();
    const existingShell = document.getElementById('centralInventoryShell');
    if (existingShell) existingShell.remove();
    if (window.renderOwnerInventoryModule) window.renderOwnerInventoryModule();
};

/**
 * Aggregates physical branch inventory to calculate accurate Global Stock and Branch counts
 */
window.populateCentralItemsWithBranchInventory = async function(items, ownerId) {
    if (!Array.isArray(items) || items.length === 0) return items || [];
    try {
        let branchIds = (window.state?.branches || []).map(b => b.id).filter(Boolean);
        if (branchIds.length === 0 && ownerId) {
            try {
                const bRows = await dbBranches.fetchAll(ownerId);
                branchIds = (bRows || []).map(b => b.id).filter(Boolean);
            } catch (e) {}
        }

        let allBranchItems = [];
        if (branchIds.length > 0) {
            try {
                const invPromises = branchIds.map(bId => dbInventory.fetchAll(bId).catch(() => ({ items: [] })));
                const results = await Promise.all(invPromises);
                results.forEach(res => {
                    const bList = Array.isArray(res) ? res : (res.items || []);
                    allBranchItems.push(...bList);
                });
            } catch (e) {
                console.warn('[Central Inventory] fetch branch inventory failed:', e);
            }
        }

        items.forEach(i => {
            const cId = i.id;
            const cSku = (i.sku || '').trim().toLowerCase();
            const cName = (i.name || '').trim().toLowerCase();

            const matched = allBranchItems.filter(b => 
                (b.central_item_id && String(b.central_item_id) === String(cId)) ||
                (cSku && b.sku && b.sku.trim().toLowerCase() === cSku) ||
                (cName && b.name && b.name.trim().toLowerCase() === cName)
            );

            i.inventory = matched;
            i.globalQty = matched.reduce((sum, inv) => sum + Number(inv.quantity || 0), 0);
            i.branchCount = new Set(matched.map(inv => inv.branch_id)).size;
        });
    } catch (err) {
        console.warn('[Central Inventory] populateCentralItemsWithBranchInventory error:', err);
        items.forEach(i => {
            i.globalQty = i.inventory ? i.inventory.reduce((sum, inv) => sum + (inv.quantity || 0), 0) : (i.globalQty || 0);
            i.branchCount = i.inventory ? i.inventory.length : (i.branchCount || 0);
        });
    }
    return items;
};

export async function renderOwnerInventoryModule() {
    const hasActiveModal = !!(
        sessionStorage.getItem('bms_active_modal') ||
        sessionStorage.getItem('bms_active_details_modal') ||
        sessionStorage.getItem('bms_active_stock_ops')
    );
    if (hasActiveModal) {
        return;
    }

    if (sessionStorage.getItem('bms_central_subview') === 'dispatch_hub' || state.activeView === 'central_dispatch') {
        const savedBranch = sessionStorage.getItem('bms_central_dispatch_branch') || null;
        return window.openCentralDispatchView(savedBranch);
    }
    if (sessionStorage.getItem('bms_central_subview') === 'restock_hub' || state.activeView === 'central_restock') {
        let savedItems = null;
        try {
            savedItems = JSON.parse(sessionStorage.getItem('bms_central_restock_items') || 'null');
        } catch (_) {}
        return window.openCentralRestockView(savedItems);
    }

    const activeTab = window.state._inventoryActiveTab || sessionStorage.getItem('bms_inventory_active_tab') || 'inventory';
    window.state._inventoryActiveTab = activeTab;
    const isServicesTab = activeTab === 'services';
    const isBranchItemsTab = activeTab === 'branch_items';

    const container = document.getElementById('mainContent');

    // 1. Mount Outer Shell ONCE (or replace if existing shell has stale header structure or old tab styling)
    let shell = document.getElementById('centralInventoryShell');
    const hasUpdatedLayout = shell && shell.querySelector('.border-t') && shell.querySelector('#tabBtnInventory.bg-indigo-600');
    if (!shell || !hasUpdatedLayout) {
        if (shell) shell.remove();
        // Close any open premium dropdowns that were portalled to body before mounting shell
        document.querySelectorAll('.dropdown-premium-list').forEach(el => {
            el.classList.add('hidden');
            if (el.parentNode === document.body) document.body.removeChild(el);
        });
        container.innerHTML = `
        <div class="space-y-4 sm:space-y-5 slide-in" id="centralInventoryShell">
            <!-- Bento Top Header Strip -->
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3.5 sm:p-4 md:p-5 flex flex-col gap-3 sm:gap-3.5">
                <!-- Top Row: Icon + Module Title + Date on Left, Tab Switcher Capsule on Right (Zero Heading Truncation) -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                    <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
                        <div class="w-9 h-9 sm:w-11 sm:h-11 rounded-xl ${isBranchItemsTab ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-100 dark:border-amber-900/50 text-amber-600 dark:text-amber-400' : (isServicesTab ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-100 dark:border-purple-900/50 text-purple-600 dark:text-purple-400' : 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400')} border flex items-center justify-center shrink-0">
                            <i data-lucide="${isBranchItemsTab ? 'git-pull-request' : (isServicesTab ? 'wrench' : 'package')}" class="w-4 h-4 sm:w-6 sm:h-6"></i>
                        </div>
                        <div class="min-w-0">
                            <h2 class="text-sm sm:text-lg font-black text-gray-900 dark:text-white tracking-tight whitespace-nowrap">
                                ${isBranchItemsTab ? 'Branch-Added Stock Items' : (isServicesTab ? 'Services & Offerings' : window.t('main_store_title', 'Main Store Inventory'))}
                            </h2>
                            <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                                <i data-lucide="calendar" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 shrink-0"></i>
                                <span>${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </p>
                        </div>
                    </div>

                    <!-- Tab Switcher Capsule (High-contrast solid active state) -->
                    <div class="inline-flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner shrink-0 self-start sm:self-auto">
                        <button type="button" onclick="window.setInventoryActiveTab('inventory')" id="tabBtnInventory"
                            class="px-3 sm:px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${activeTab === 'inventory' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}">
                            Inventory Products
                        </button>
                        <button type="button" onclick="window.setInventoryActiveTab('services')" id="tabBtnServices"
                            class="px-3 sm:px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${activeTab === 'services' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}">
                            Services
                        </button>
                        <button type="button" onclick="window.setInventoryActiveTab('branch_items')" id="tabBtnBranchItems"
                            class="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${activeTab === 'branch_items' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}">
                            <span>Branch Items</span>
                            <span id="branchItemsBadgeCounter" class="hidden px-1.5 py-0.2 rounded-full text-[10px] font-black ${activeTab === 'branch_items' ? 'bg-white/30 text-white' : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'}">0</span>
                        </button>
                    </div>
                </div>

                <!-- Bottom Row: Desktop Action Buttons (Right-aligned, 100% full width clearance, zero overlap on heading) -->
                <div class="pt-2.5 sm:pt-3 border-t border-gray-100 dark:border-gray-700/60">
                    <!-- Desktop Action Buttons (sm and above: cleanly aligned to the right) -->
                    <div class="hidden sm:flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 w-full">
                        ${isBranchItemsTab ? `
                        <button onclick="window.renderBranchItemsView(true)" data-tooltip="Refresh branch inventory submissions" data-tooltip-title="Refresh Submissions" data-tooltip-variant="amber" class="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs whitespace-nowrap">
                            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                            <span>Refresh Submissions</span>
                        </button>
                        ` : isServicesTab ? `
                        <button onclick="window.downloadServicesCSVTemplate()" data-tooltip="Download spreadsheet template for services" data-tooltip-title="Services Template" data-tooltip-variant="purple" class="inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900 border border-purple-200 dark:border-purple-800 active:scale-[0.98] transition-all cursor-pointer shadow-xs whitespace-nowrap">
                            <i data-lucide="download" class="w-3.5 h-3.5"></i>
                            <span>Template</span>
                        </button>
                        <button onclick="window.importServicesCSV()" data-tooltip="Bulk import service offerings via CSV or Excel" data-tooltip-title="Import Services" data-tooltip-variant="purple" class="inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900 border border-purple-200 dark:border-purple-800 active:scale-[0.98] transition-all cursor-pointer shadow-xs whitespace-nowrap">
                            <i data-lucide="upload" class="w-3.5 h-3.5"></i>
                            <span>Import CSV</span>
                        </button>
                        <button onclick="window.openCentralItemModal('service')" data-tooltip="Register new service offering" data-tooltip-title="Add Service" data-tooltip-variant="purple" class="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs whitespace-nowrap">
                            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                            <span>Add Service</span>
                        </button>
                        ` : `
                        <button onclick="window.openCentralRestockModal()" data-tooltip="Replenish stock for existing catalog products" data-tooltip-title="Restock Inventory" data-tooltip-variant="emerald" class="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs whitespace-nowrap">
                            <i data-lucide="package-plus" class="w-3.5 h-3.5"></i>
                            <span>${window.t('restock_stock', 'Restock Stock')}</span>
                        </button>
                        <button onclick="window.openCentralItemModal('product')" data-tooltip="Register new catalog item" data-tooltip-title="Purchase & Add Stock" data-tooltip-variant="indigo" class="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs whitespace-nowrap">
                            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                            <span>${window.t('purchase_add_stock', 'Purchase & Add Stock')}</span>
                        </button>
                        <button onclick="window.openCentralDispatchView()" data-tooltip="Batch dispatch stock from headquarters to destination branch locations" data-tooltip-title="Central Dispatch Hub" data-tooltip-variant="teal" class="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs whitespace-nowrap">
                            <i data-lucide="truck" class="w-3.5 h-3.5"></i>
                            <span>${window.t('nav_central_dispatch', 'Central Dispatch')}</span>
                        </button>
                        <button onclick="window.openDownloadStockSheetModal()" data-tooltip="Download curated inventory stock sheet (PDF / CSV)" data-tooltip-title="Download Stock Sheet" data-tooltip-variant="blue" class="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs whitespace-nowrap">
                            <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5 text-white"></i>
                            <span>${window.t('download_stocksheet', 'Stock Sheet')}</span>
                        </button>
                        `}
                    </div>

                    <!-- Mobile-only Action Grid (2x2 grid, NO horizontal scroll!) -->
                    <div class="sm:hidden w-full">
                        ${isBranchItemsTab ? `
                        <div class="w-full">
                            <button onclick="window.renderBranchItemsView(true)" class="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs whitespace-nowrap">
                                <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                                <span>Refresh Submissions</span>
                            </button>
                        </div>
                        ` : !isServicesTab ? `
                        <div class="grid grid-cols-2 gap-2 w-full">
                            <button onclick="window.openCentralRestockModal()" class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs whitespace-nowrap">
                                <i data-lucide="package-plus" class="w-3.5 h-3.5"></i>
                                <span>${window.t('restock_stock', 'Restock Stock')}</span>
                            </button>
                            <button onclick="window.openCentralItemModal('product')" class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs whitespace-nowrap">
                                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                                <span>${window.t('purchase_add_stock', 'Add Stock')}</span>
                            </button>
                            <button onclick="window.openCentralDispatchView()" class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs whitespace-nowrap">
                                <i data-lucide="truck" class="w-3.5 h-3.5"></i>
                                <span>${window.t('nav_central_dispatch', 'Dispatch')}</span>
                            </button>
                            <button onclick="window.openDownloadStockSheetModal()" class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs whitespace-nowrap">
                                <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5 text-white"></i>
                                <span>${window.t('download_stocksheet', 'Stock Sheet')}</span>
                            </button>
                        </div>
                        ` : `
                        <div class="grid grid-cols-2 gap-2 w-full">
                            <button onclick="window.importServicesCSV()" class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900 border border-purple-200 dark:border-purple-800 active:scale-[0.98] transition-all cursor-pointer shadow-xs whitespace-nowrap">
                                <i data-lucide="upload" class="w-3.5 h-3.5"></i>
                                <span>Import CSV</span>
                            </button>
                            <button onclick="window.openCentralItemModal('service')" class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs whitespace-nowrap">
                                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                                <span>Add Service</span>
                            </button>
                        </div>
                        `}
                    </div>
                </div>
            </div>

            <!-- Branch Items View Container (Only shown when activeTab === 'branch_items') -->
            <div id="branchItemsViewContainer" class="${isBranchItemsTab ? '' : 'hidden'} space-y-4"></div>

            <!-- Bento Financial Summary Cards -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 ${isBranchItemsTab ? 'hidden' : ''}" id="centralInventoryStatsGrid">
                ${[1, 2, 3, 4, 5, 6, 7, 8].map(() => `<div class="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse h-16"></div>`).join('')}
            </div>

            <!-- Sticky Fixed Bulk Actions Toolbar -->
            <div id="centralBulkActionsBar" class="hidden sticky top-0 z-40 flex items-center justify-between gap-3 p-3.5 sm:p-4 bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-300 dark:border-rose-700/80 rounded-2xl shadow-lg transition-all">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                        <i data-lucide="check-square" class="w-4 h-4 text-white"></i>
                    </div>
                    <div class="min-w-0">
                        <p id="centralSelectedCountText" class="text-xs sm:text-sm font-black text-rose-950 dark:text-rose-100 tracking-tight">0 items selected</p>
                        <p class="text-[11px] text-rose-700 dark:text-rose-300 font-medium truncate">Selected items will be deleted from Central Catalog and linked branch stocks.</p>
                    </div>
                </div>
                <div class="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                    <button type="button" onclick="window.clearCentralSelection()" class="px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold border border-gray-300 dark:border-gray-600 rounded-xl text-xs transition-colors cursor-pointer shadow-xs">
                        Cancel
                    </button>
                    ${!isServicesTab ? `
                    <button type="button" onclick="window.openCentralRestockModal(Array.from(window.selectedCentralItemIds))" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer">
                        <i data-lucide="package-plus" class="w-3.5 h-3.5 text-white"></i>
                        <span>Restock Selected</span>
                    </button>
                    ` : ''}
                    <button type="button" onclick="window.deleteSelectedCentralItems()" class="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5 text-white"></i>
                        <span>Delete Selected</span>
                    </button>
                </div>
            </div>

            <!-- Clean Transparent Sticky Search Bar & Filter Header (Desktop/Tablet Only) -->
            <div class="${isBranchItemsTab ? 'hidden' : 'hidden sm:flex'} sticky top-0 z-30 pt-0.5 pb-1 sm:pt-1 sm:pb-1.5 mb-2 justify-center">
                <div class="flex flex-wrap sm:flex-nowrap items-center justify-center gap-2.5 max-w-lg w-full mx-auto">
                    <div class="flex-1 relative min-w-[160px] sm:max-w-xs">
                        <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400"></i>
                        <input type="search" id="invSearchInput" autocomplete="off" placeholder="${isServicesTab ? 'Search service offerings...' : 'Search main store...'}" value="${window.state._invSearch || ''}"
                            class="w-full pl-11 pr-4 py-2 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 font-medium text-gray-900 dark:text-white rounded-full text-xs sm:text-sm focus:ring-2 ${isServicesTab ? 'focus:ring-purple-500 focus:border-purple-500' : 'focus:ring-indigo-500 focus:border-indigo-500'} outline-none"
                            style="padding-left: 2.85rem !important;"
                            oninput="window.filterCentralInventoryList(null, this.value)"
                            onsearch="window.filterCentralInventoryList(null, this.value)"
                            onchange="window.filterCentralInventoryList(null, this.value)"
                            onkeyup="window.filterCentralInventoryList(null, this.value)">
                    </div>
                    <div class="w-full sm:w-48 shrink-0">
                        ${window.renderPremiumSelect({
                            id: 'invStatusFilter',
                            selectedValue: window.state._invStatusFilter || 'all',
                            searchable: false,
                            classes: 'w-full text-xs sm:text-sm rounded-full border-2 border-gray-300 dark:border-gray-600 font-medium text-gray-900 dark:text-white',
                            onChange: 'window.filterCentralInventoryList(this.value, null)',
                            options: isServicesTab ? [
                                { value: 'all', label: 'All Services', icon: 'filter' },
                                { value: 'low', label: 'Under-utilized', icon: 'clock' },
                                { value: 'out', label: 'Draft Services', icon: 'file-text' }
                            ] : [
                                { value: 'all', label: 'All Stock Status', icon: 'filter' },
                                { value: 'low', label: 'Low Global Stock', icon: 'alert-triangle' },
                                { value: 'out', label: 'Out of Global Stock', icon: 'x-circle' }
                            ]
                        })}
                    </div>
                </div>
            </div>

            <!-- Mobile Action & Quick Shortcuts -->
            <div class="${isBranchItemsTab ? 'hidden' : 'sm:hidden'} space-y-3">
                <!-- Primary View Action -->
                <button onclick="window.showCentralInventoryModal('all')" class="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl shadow-sm active:scale-[0.98] transition-all cursor-pointer">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                            <i data-lucide="${isServicesTab ? 'wrench' : 'package'}" class="w-4.5 h-4.5"></i>
                        </div>
                        <div class="text-left min-w-0">
                            <p class="text-xs font-black tracking-wide leading-tight truncate">${isServicesTab ? 'Open Services Catalog' : window.t('open_inventory', 'Open Inventory')}</p>
                            <p class="text-[10px] text-indigo-100 font-medium truncate">${isServicesTab ? 'Browse and manage all branch service offerings' : 'Browse full central catalog, stock levels & SKUs'}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 text-[11px] font-bold text-white bg-white/20 px-2.5 py-1 rounded-lg shrink-0">
                        <span>Open</span>
                        <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                    </div>
                </button>

                ${isServicesTab ? `
                <button onclick="window.openCentralItemModal('service')" class="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl shadow-sm active:scale-[0.98] transition-all cursor-pointer">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                            <i data-lucide="plus" class="w-4.5 h-4.5"></i>
                        </div>
                        <div class="text-left">
                            <p class="text-xs font-black tracking-wide leading-tight">Add Service Offering</p>
                            <p class="text-[10px] text-purple-100 font-medium">Create and distribute billable services</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 text-[11px] font-bold text-white bg-white/20 px-2.5 py-1 rounded-lg shrink-0">
                        <span>New</span>
                        <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                    </div>
                </button>
                ` : `
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

                <!-- Mobile Stat Badges Row -->
                <div class="grid grid-cols-4 gap-1.5">
                    <div class="bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                        <div class="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center mx-auto mb-1">
                            <i data-lucide="package-check" class="w-3.5 h-3.5 text-emerald-600"></i>
                        </div>
                        <p class="text-[9.5px] font-bold uppercase tracking-tight text-gray-500 dark:text-gray-400">Total</p>
                        <p id="mobileTotalItemsCount" class="text-sm font-black text-emerald-600 dark:text-emerald-400 leading-tight mt-0.5">0</p>
                    </div>
                    <div class="bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                        <div class="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center mx-auto mb-1">
                            <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-amber-500"></i>
                        </div>
                        <p class="text-[9.5px] font-bold uppercase tracking-tight text-gray-500 dark:text-gray-400">Low Stock</p>
                        <p id="mobileLowStockCount" class="text-sm font-black text-amber-500 leading-tight mt-0.5">0</p>
                    </div>
                    <div class="bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                        <div class="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center mx-auto mb-1">
                            <i data-lucide="alert-circle" class="w-3.5 h-3.5 text-rose-500"></i>
                        </div>
                        <p class="text-[9.5px] font-bold uppercase tracking-tight text-gray-500 dark:text-gray-400">Out Stock</p>
                        <p id="mobileOutOfStockCount" class="text-sm font-black text-rose-500 leading-tight mt-0.5">0</p>
                    </div>
                    <div class="bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                        <div class="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center mx-auto mb-1">
                            <i data-lucide="trending-up" class="w-3.5 h-3.5 text-indigo-500"></i>
                        </div>
                        <p class="text-[9.5px] font-bold uppercase tracking-tight text-gray-500 dark:text-gray-400">Performing</p>
                        <p id="mobilePerformingStockCount" class="text-sm font-black text-indigo-600 dark:text-indigo-400 leading-tight mt-0.5">0</p>
                    </div>
                </div>
                `}
            </div>

            <!-- Cross-Page Bulk Selection Notice Banner -->
            <div id="centralCrossPageSelectBanner" class="hidden px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-3">
                <span id="centralCrossPageSelectText">All items on this page are selected.</span>
                <div class="flex items-center gap-2 shrink-0">
                    <button type="button" onclick="window.selectAllFullCatalogue()" class="font-black underline text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 cursor-pointer">
                        Select all items in catalogue
                    </button>
                    <button type="button" onclick="window.clearCentralSelection()" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 cursor-pointer">
                        Clear
                    </button>
                </div>
            </div>

            <!-- Central Inventory Desktop & Tablet Table View (sm and up) -->
            <div class="${isBranchItemsTab ? 'hidden' : 'hidden sm:block'} w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div class="w-full overflow-x-auto">
                    <table class="w-full text-left border-collapse table-auto">
                        <thead class="table-header-accent text-white font-black uppercase tracking-wider text-xs">
                            <tr>
                                <th class="w-10 px-3 py-3 text-center">
                                    <input type="checkbox" id="selectAllCentralItems" onchange="window.toggleSelectAllCentralItems(this.checked)" class="rounded border-gray-300 ${isServicesTab ? 'text-purple-600 focus:ring-purple-500' : 'text-indigo-600 focus:ring-indigo-500'} w-4 h-4 cursor-pointer">
                                </th>
                                <th class="w-[28%] px-4 py-3 text-left">${isServicesTab ? 'Service Offering' : 'Product & Description'}</th>
                                <th class="w-[20%] px-4 py-3 text-left">${isServicesTab ? 'Category / Code' : 'Category / SKU'}</th>
                                <th class="w-[16%] px-4 py-3 text-left">${isServicesTab ? 'Direct Cost' : 'Stock (HQ / Global)'}</th>
                                <th class="w-[18%] px-4 py-3 text-left">${isServicesTab ? 'Fee (Retail / Partner)' : 'Retail / Wholesale'}</th>
                                <th class="w-[18%] px-4 py-3 text-right pr-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="centralInventoryTbody" class="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-800">
                            <tr><td colspan="6" class="py-12 text-center text-gray-400 text-sm animate-pulse">Loading items...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Central Inventory Pagination Footer (Tablet & Desktop) -->
            <div id="centralInventoryPaginationFooter" class="${isBranchItemsTab ? 'hidden' : 'hidden sm:block'} bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mt-3"></div>
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

    // If active tab is Branch Items, render dedicated branch items subview and exit
    if (isBranchItemsTab) {
        window.renderBranchItemsView();
        window.updateBranchItemsBadgeCounter();
        return;
    } else {
        window.updateBranchItemsBadgeCounter();
    }

    const fetchOwnerId = window.state?.ownerId || window.state?.currentUserUuid || (window.state?.profile && window.state.profile.id) || (window.state?.user && window.state.user.id) || (typeof window.getCurrentOwnerId === 'function' ? window.getCurrentOwnerId() : null);

    // Fast IndexedDB Pre-Hydration: If in-memory cache is empty, hydrate immediately from local IndexedDB
    if ((!window._cachedCentralItems || window._cachedCentralItems.length === 0) && fetchOwnerId) {
        try {
            const preLocal = await getLocalItems('central_inventory', i => !fetchOwnerId || i.owner_id === fetchOwnerId, 'name', true);
            if (Array.isArray(preLocal) && preLocal.length > 0 && (!window._cachedCentralItems || window._cachedCentralItems.length === 0)) {
                window._cachedCentralItems = preLocal;
                const _preSearch = (typeof window.state._invSearch === 'string') ? window.state._invSearch : '';
                window.filterCentralInventoryList(window.state._invStatusFilter || null, _preSearch);
            }
        } catch (e) {}
    }

    try {
        const fetchTask = window.dbCentralInventory.fetchAll(fetchOwnerId);
        const timeoutTask = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Central inventory loading timed out (>10s)')), 10000)
        );

        let items;
        try {
            items = await Promise.race([fetchTask, timeoutTask]);
        } catch (timeoutOrErr) {
            console.warn('[Central Inventory 10s Watchdog Triggered]', timeoutOrErr.message);
            // Force retry once freshly with cached fallback
            try {
                items = await Promise.race([
                    window.dbCentralInventory.fetchAll(fetchOwnerId),
                    new Promise(r => setTimeout(() => r(window._cachedCentralItems || []), 8000))
                ]);
            } catch (e) {
                items = window._cachedCentralItems || [];
            }
        }

        items = items || [];

        // Failsafe 1: If query returned 0 items from remote while online, proactively refresh auth session & re-fetch
        if (items.length === 0 && fetchOwnerId && navigator.onLine) {
            try {
                const { data: refreshData } = await supabase.auth.refreshSession();
                if (refreshData?.session) {
                    const retryRes = await window.dbCentralInventory.fetchAll(fetchOwnerId);
                    if (Array.isArray(retryRes) && retryRes.length > 0) {
                        items = retryRes;
                    }
                }
            } catch (refreshErr) {
                console.warn('[Central Inventory] Auto session refresh on empty catalog notice:', refreshErr.message);
            }
        }

        // Failsafe 2 (Zero-Wipe Fallback): If remote still returns 0, retain verified local IndexedDB items rather than wiping catalog to 0
        if (items.length === 0 && fetchOwnerId) {
            try {
                const localFallback = await getLocalItems('central_inventory', i => !fetchOwnerId || i.owner_id === fetchOwnerId, 'name', true);
                if (Array.isArray(localFallback) && localFallback.length > 0) {
                    console.log('[Central Inventory] Preserving verified local IndexedDB items rather than wiping catalog to 0.');
                    items = localFallback;
                } else if (Array.isArray(window._cachedCentralItems) && window._cachedCentralItems.length > 0) {
                    items = window._cachedCentralItems;
                }
            } catch (e) {}
        }

        await window.populateCentralItemsWithBranchInventory(items, fetchOwnerId);

        window._cachedCentralItems = items;

        if (isServicesTab) {
            const services = items.filter(i => i.item_type === 'service');
            const catalogCountEl = document.getElementById('centralCatalogCount');
            if (catalogCountEl) catalogCountEl.textContent = `${services.length} registered service offerings`;

            const totalFees = services.reduce((sum, s) => sum + Number(s.retail_price || s.price || 0), 0);
            const avgFee = services.length > 0 ? Math.round(totalFees / services.length) : 0;
            const totalBranchAssignments = services.reduce((sum, s) => sum + Number(s.branchCount || 0), 0);
            const uniqueCategories = new Set(services.map(s => (s.category || 'General').trim().toLowerCase())).size;

            const statsGrid = document.getElementById('centralInventoryStatsGrid');
            if (statsGrid) {
                const currencySymbol = window.fmt ? window.fmt.getSymbol() : 'TSh';
                statsGrid.innerHTML = `
                    <!-- Total Active Services -->
                    <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
                        <div class="flex items-center justify-between mb-1.5 pr-10">
                            <span class="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-tight truncate block">Active Services</span>
                        </div>
                        <div class="min-w-0 mt-auto pr-9">
                            <p class="text-dynamic-lg font-black text-purple-600 dark:text-purple-400 truncate leading-tight">${services.length}</p>
                            <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">Offerings</p>
                        </div>
                        <svg class="absolute bottom-2 right-2 w-5 h-3 text-purple-400 opacity-80" viewBox="0 0 36 24" fill="currentColor">
                            <rect x="2" y="10" width="4.5" height="14" rx="1.5"/>
                            <rect x="9" y="6" width="4.5" height="18" rx="1.5"/>
                            <rect x="16" y="12" width="4.5" height="12" rx="1.5"/>
                            <rect x="23" y="4" width="4.5" height="20" rx="1.5"/>
                            <rect x="30" y="8" width="4.5" height="16" rx="1.5"/>
                        </svg>
                    </div>

                    <!-- Average Service Fee -->
                    <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">${currencySymbol}</div>
                        <div class="flex items-center justify-between mb-1.5 pr-10">
                            <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">Average Fee</span>
                        </div>
                        <div class="min-w-0 mt-auto pr-9">
                            <p class="text-dynamic-lg font-black text-emerald-600 dark:text-emerald-400 truncate leading-tight" title="${window.fmt.currency(avgFee)}">${window.fmt.number(avgFee)}</p>
                            <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">Standard Rate</p>
                        </div>
                        <svg class="absolute bottom-2 right-2 w-5.5 h-3.5 opacity-75" viewBox="0 0 40 24" fill="none">
                            <path d="M2 16 L10 10 L18 14 L26 6 L38 3" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="38" cy="3" r="2.5" fill="#10B981"/>
                        </svg>
                    </div>

                    <!-- Branch Availability -->
                    <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
                        <div class="flex items-center justify-between mb-1.5 pr-10">
                            <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">Branch Availability</span>
                        </div>
                        <div class="min-w-0 mt-auto pr-9">
                            <p class="text-dynamic-lg font-black text-indigo-600 dark:text-indigo-400 truncate leading-tight">${totalBranchAssignments}</p>
                            <p class="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 truncate">Assigned to Branches</p>
                        </div>
                        <svg class="absolute bottom-2 right-2 w-5.5 h-3.5 opacity-75" viewBox="0 0 40 24" fill="none">
                            <path d="M2 18 L10 12 L18 16 L26 8 L38 4" stroke="#3B86F7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="38" cy="4" r="2.5" fill="#3B86F7"/>
                        </svg>
                    </div>

                    <!-- Service Categories -->
                    <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
                        <div class="flex items-center justify-between mb-1.5 pr-10">
                            <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">Categories</span>
                        </div>
                        <div class="min-w-0 mt-auto pr-9">
                            <p class="text-dynamic-lg font-black text-gray-900 dark:text-white truncate leading-tight">${uniqueCategories}</p>
                            <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">Segments</p>
                        </div>
                        <div class="absolute bottom-2 right-2 w-5.5 h-5.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 text-[10px] font-black shadow-2xs">
                            <i data-lucide="layers" class="w-3 h-3"></i>
                        </div>
                    </div>`;
            }
        } else {
            const products = items.filter(i => (i.item_type || 'product') === 'product' && !((i.category && String(i.category).toLowerCase().includes('service')) || (i.unit && String(i.unit).toLowerCase() === 'service')));
            const mainStoreCost = products.reduce((s, i) => s + (Number(i.cost_price || 0) * Number(i.main_store_stock || 0)), 0);
            const mainStoreExpectedSales = products.reduce((s, i) => s + (Number(i.retail_price || i.price || 0) * Number(i.main_store_stock || 0)), 0);
            const mainStoreProfitPotential = mainStoreExpectedSales - mainStoreCost;
            const totalGlobalExpectedSales = products.reduce((s, i) => s + (Number(i.retail_price || i.price || 0) * Number(i.globalQty)), 0);

            // Row 2 Operational & Stock Volume Metrics
            const totalHQStockUnits = products.reduce((s, i) => s + (Number(i.main_store_stock) || 0), 0);
            const totalBranchStockUnits = products.reduce((s, i) => s + (Number(i.globalQty) || 0), 0);
            const totalStoreInventoryUnits = totalHQStockUnits + totalBranchStockUnits;

            let totalDispatchedQty = 0;
            try {
                const movements = await dbStockMovements.fetchAll(fetchOwnerId, { movementType: 'dispatch', limit: 2000 });
                if (Array.isArray(movements) && movements.length > 0) {
                    totalDispatchedQty = movements.reduce((s, m) => s + (Number(m.quantity) || 0), 0);
                } else {
                    const localMovements = await getLocalItems('stock_movements', m => (!fetchOwnerId || m.owner_id === fetchOwnerId) && m.movement_type === 'dispatch', 'created_at', false);
                    if (Array.isArray(localMovements)) {
                        totalDispatchedQty = localMovements.reduce((s, m) => s + (Number(m.quantity) || 0), 0);
                    }
                }
            } catch (e) {
                console.warn('[Central Inventory] Dispatched count note:', e);
            }

            const catalogCountEl = document.getElementById('centralCatalogCount');
            if (catalogCountEl) catalogCountEl.textContent = `${products.length} ${window.t('registered_catalogs', 'registered product catalogs')}`;

            const lowStockCount = products.filter(i => Number(i.main_store_stock || 0) <= Number(i.min_threshold || 5) || Number(i.globalQty || 0) <= Number(i.min_threshold || 5)).length;
            const healthyStockCount = products.filter(i => Number(i.main_store_stock || 0) > Number(i.min_threshold || 5) || Number(i.globalQty || 0) > Number(i.min_threshold || 5)).length;
            const performingStockCount = products.filter(i => (Number(i.retail_price || i.price || 0) > Number(i.cost_price || 0)) && (Number(i.main_store_stock || 0) > 0 || Number(i.globalQty || 0) > 0)).length;

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
                    <!-- ROW 1 (FINANCIAL VALUATION) -->

                    <!-- 1. Main Store Stock Cost -->
                    <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-2xs z-10">${currencySymbol}</div>
                        <div class="flex items-center justify-between mb-1.5 pr-10">
                            <span class="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tight truncate block">${window.t('main_store_cost', 'Stock Cost')}</span>
                        </div>
                        <div class="min-w-0 mt-auto pr-9">
                            <p class="text-dynamic-lg font-black text-amber-600 dark:text-amber-400 truncate leading-tight" title="${window.fmt.currency(mainStoreCost)}">${window.fmt.number(mainStoreCost)}</p>
                            <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">HQ Valuation</p>
                        </div>
                        <svg class="absolute bottom-2 right-2 w-5 h-3 text-amber-400 opacity-75" viewBox="0 0 36 24" fill="currentColor">
                            <rect x="2" y="8" width="4.5" height="16" rx="1.5"/>
                            <rect x="9" y="12" width="4.5" height="12" rx="1.5"/>
                            <rect x="16" y="5" width="4.5" height="19" rx="1.5"/>
                            <rect x="23" y="9" width="4.5" height="15" rx="1.5"/>
                            <rect x="30" y="3" width="4.5" height="21" rx="1.5"/>
                        </svg>
                    </div>

                    <!-- 2. Expected Sales Return -->
                    <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">${currencySymbol}</div>
                        <div class="flex items-center justify-between mb-1.5 pr-10">
                            <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">${window.t('expected_sales_return', 'Expected Return')}</span>
                        </div>
                        <div class="min-w-0 mt-auto pr-9">
                            <p class="text-dynamic-lg font-black text-emerald-600 dark:text-emerald-400 truncate leading-tight" title="${window.fmt.currency(mainStoreExpectedSales)}">${window.fmt.number(mainStoreExpectedSales)}</p>
                            <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">Retail Value</p>
                        </div>
                        <svg class="absolute bottom-2 right-2 w-5.5 h-3.5 opacity-75" viewBox="0 0 40 24" fill="none">
                            <path d="M2 16 L10 10 L18 14 L26 6 L38 3" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="38" cy="3" r="2.5" fill="#10B981"/>
                        </svg>
                    </div>

                    <!-- 3. Potential Profit -->
                    <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs z-10">${currencySymbol}</div>
                        <div class="flex items-center justify-between mb-1.5 pr-10">
                            <span class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tight truncate block">${window.t('potential_profit', 'Potential Profit')}</span>
                        </div>
                        <div class="min-w-0 mt-auto pr-9">
                            <p class="text-dynamic-lg font-black text-indigo-600 dark:text-indigo-400 truncate leading-tight" title="${window.fmt.currency(mainStoreProfitPotential)}">${window.fmt.number(mainStoreProfitPotential)}</p>
                            <p class="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 truncate">Projected Margin</p>
                        </div>
                        <div class="absolute bottom-2 right-2 w-5.5 h-5.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 text-[10px] font-black shadow-2xs">
                            <i data-lucide="trending-up" class="w-3 h-3"></i>
                        </div>
                    </div>

                    <!-- 4. Total Global Expected Return -->
                    <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 shadow-2xs z-10">${currencySymbol}</div>
                        <div class="flex items-center justify-between mb-1.5 pr-10">
                            <span class="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-tight truncate block">${window.t('total_global_return', 'Global Value')}</span>
                        </div>
                        <div class="min-w-0 mt-auto pr-9">
                            <p class="text-dynamic-lg font-black text-purple-600 dark:text-purple-400 truncate leading-tight" title="${window.fmt.currency(totalGlobalExpectedSales)}">${window.fmt.number(totalGlobalExpectedSales)}</p>
                            <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">All Branches + HQ</p>
                        </div>
                        <div class="absolute bottom-2 right-2 w-5.5 h-5.5 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 text-[10px] font-black shadow-2xs">
                            <i data-lucide="globe" class="w-3 h-3"></i>
                        </div>
                    </div>

                    <!-- ROW 2 (OPERATIONAL & STOCK VOLUME) -->

                    <!-- 5. Total Store Inventory Items (Main Store & Branches) -->
                    <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-50 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 shadow-2xs z-10">All Stores</div>
                        <div class="flex items-center justify-between mb-1.5 pr-10">
                            <span class="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-tight truncate block">Total Store Inventory</span>
                        </div>
                        <div class="min-w-0 mt-auto pr-9">
                            <p class="text-dynamic-lg font-black text-cyan-600 dark:text-cyan-400 truncate leading-tight" title="${window.fmt.number(totalStoreInventoryUnits)} Units">
                                ${window.fmt.number(totalStoreInventoryUnits)} <span class="text-xs font-bold text-cyan-700/70 dark:text-cyan-300/70">Units</span>
                            </p>
                            <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">Across ${products.length} Products (HQ + Branches)</p>
                        </div>
                        <div class="absolute bottom-2 right-2 w-5.5 h-5.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 flex items-center justify-center text-cyan-600 text-[10px] font-black shadow-2xs">
                            <i data-lucide="boxes" class="w-3 h-3"></i>
                        </div>
                    </div>

                    <!-- 6. Total Dispatched Items -->
                    <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-50 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 shadow-2xs z-10">Dispatched</div>
                        <div class="flex items-center justify-between mb-1.5 pr-10">
                            <span class="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-tight truncate block">Total Dispatched Items</span>
                        </div>
                        <div class="min-w-0 mt-auto pr-9">
                            <p class="text-dynamic-lg font-black text-orange-600 dark:text-orange-400 truncate leading-tight" title="${window.fmt.number(totalDispatchedQty)} Units">
                                ${window.fmt.number(totalDispatchedQty)} <span class="text-xs font-bold text-orange-700/70 dark:text-orange-300/70">Units</span>
                            </p>
                            <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">Main Store to Branches</p>
                        </div>
                        <div class="absolute bottom-2 right-2 w-5.5 h-5.5 rounded-full bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 flex items-center justify-center text-orange-600 text-[10px] font-black shadow-2xs">
                            <i data-lucide="truck" class="w-3 h-3"></i>
                        </div>
                    </div>

                    <!-- 7. HQ Main Store Stock -->
                    <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-2xs z-10">Main Store</div>
                        <div class="flex items-center justify-between mb-1.5 pr-10">
                            <span class="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight truncate block">HQ Store Stock</span>
                        </div>
                        <div class="min-w-0 mt-auto pr-9">
                            <p class="text-dynamic-lg font-black text-blue-600 dark:text-blue-400 truncate leading-tight" title="${window.fmt.number(totalHQStockUnits)} Units">
                                ${window.fmt.number(totalHQStockUnits)} <span class="text-xs font-bold text-blue-700/70 dark:text-blue-300/70">Units</span>
                            </p>
                            <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">Available in HQ Store</p>
                        </div>
                        <div class="absolute bottom-2 right-2 w-5.5 h-5.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 text-[10px] font-black shadow-2xs">
                            <i data-lucide="warehouse" class="w-3 h-3"></i>
                        </div>
                    </div>

                    <!-- 8. Branch Store Stock -->
                    <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 shadow-2xs z-10">Branches</div>
                        <div class="flex items-center justify-between mb-1.5 pr-10">
                            <span class="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-tight truncate block">Branch Store Stock</span>
                        </div>
                        <div class="min-w-0 mt-auto pr-9">
                            <p class="text-dynamic-lg font-black text-teal-600 dark:text-teal-400 truncate leading-tight" title="${window.fmt.number(totalBranchStockUnits)} Units">
                                ${window.fmt.number(totalBranchStockUnits)} <span class="text-xs font-bold text-teal-700/70 dark:text-teal-300/70">Units</span>
                            </p>
                            <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">Active in Branch Outlets</p>
                        </div>
                        <div class="absolute bottom-2 right-2 w-5.5 h-5.5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 text-[10px] font-black shadow-2xs">
                            <i data-lucide="git-branch" class="w-3 h-3"></i>
                        </div>
                    </div>
                `;

                if (window.lucide) window.lucide.createIcons();
            }
        }

        // Re-apply current search/status so user context is preserved after any re-render (including realtime-triggered ones)
        const _postFetchSearch = (typeof window.state._invSearch === 'string') ? window.state._invSearch : '';
        window.filterCentralInventoryList(window.state._invStatusFilter || null, _postFetchSearch);

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
            tbody.innerHTML = `<tr><td colspan="${isServicesTab ? 7 : 8}" class="py-12 text-center select-none">
                <div class="flex flex-col items-center justify-center gap-2">
                    <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1 border border-amber-200 dark:border-amber-900/50 shadow-xs">
                        <i data-lucide="wifi-off" class="w-6 h-6"></i>
                    </div>
                    <p class="font-bold text-gray-900 dark:text-white text-sm">Couldn't Load ${isServicesTab ? 'Services Catalog' : 'Central Inventory Catalog'}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 max-w-sm">Unable to fetch items since you are currently offline or connection was interrupted.</p>
                    <button type="button" onclick="window.renderOwnerInventoryModule()" class="mt-2 px-4 py-2 ${isServicesTab ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer">
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

    const card = document.querySelector(`[data-central-id="${itemId}"]`);
    if (card) {
        if (isChecked) {
            card.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-50/40', 'dark:bg-indigo-950/30');
        } else {
            card.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-50/40', 'dark:bg-indigo-950/30');
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

window.resyncCentralInventory = async function() {
    try {
        if (typeof window.showToast === 'function') window.showToast('Re-syncing inventory and renewing session...', 'info');
        window._cachedCentralItems = null;
        try {
            await supabase.auth.refreshSession();
        } catch (e) {}
        if (typeof window.renderOwnerInventoryModule === 'function') {
            await window.renderOwnerInventoryModule();
        }
        if (typeof window.showToast === 'function') window.showToast('Inventory catalog re-synced successfully.', 'success');
    } catch (err) {
        console.error('[resyncCentralInventory error]', err);
        if (typeof window.showToast === 'function') window.showToast('Re-sync failed. Please check connection.', 'error');
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

window.filterCentralInventoryList = async function(statusVal, searchVal) {
    if (!window.centralInventoryPageState) {
        window.centralInventoryPageState = { page: 1, pageSize: 12, modalPage: 1, modalPageSize: 12 };
    }

    const searchInput = document.getElementById('invSearchInput');
    const domSearchVal = searchInput ? searchInput.value : '';

    if (statusVal !== undefined && statusVal !== null) {
        if (statusVal === 'healthy') statusVal = 'in_stock';
        if (statusVal === 'low') statusVal = 'low_stock';
        if (statusVal === 'out') statusVal = 'out_of_stock';
        window.state._invStatusFilter = statusVal;
        window.centralInventoryPageState.page = 1;
    }

    if (typeof searchVal === 'string') {
        window.state._invSearch = searchVal;
        if (searchInput && searchInput.value !== searchVal) {
            searchInput.value = searchVal;
        }
        window.centralInventoryPageState.page = 1;
    } else if (searchInput) {
        window.state._invSearch = domSearchVal;
    }

    let items = window._cachedCentralItems;
    if (!items || items.length === 0) {
        const fetchOwnerId = window.state.ownerId;
        if (fetchOwnerId) {
            try {
                items = await window.dbCentralInventory.fetchAll(fetchOwnerId);
                items = items || [];
                await window.populateCentralItemsWithBranchInventory(items, fetchOwnerId);
                window._cachedCentralItems = items;
            } catch (e) {
                console.error('[filterCentralInventoryList] fetch failed', e);
            }
        }
    }
    items = window._cachedCentralItems || [];

    const activeTab = window.state._inventoryActiveTab || sessionStorage.getItem('bms_inventory_active_tab') || 'inventory';
    const isServicesTab = activeTab === 'services';
    const savedStatus = window.state._invStatusFilter || 'all';
    const effectiveSearch = (typeof window.state._invSearch === 'string') ? window.state._invSearch : domSearchVal;
    const currentQuery = effectiveSearch.trim().toLowerCase();

    let filtered = [...items];
    if (isServicesTab) {
        filtered = filtered.filter(i => i.item_type === 'service');
        if (savedStatus === 'assigned') {
            filtered = filtered.filter(i => (i.branchCount || 0) > 0);
        } else if (savedStatus === 'unassigned') {
            filtered = filtered.filter(i => (i.branchCount || 0) === 0);
        }
    } else {
        filtered = filtered.filter(i => (i.item_type || 'product') === 'product');
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
    }

    if (currentQuery) {
        filtered = filtered.filter(i => {
            const name = (i.name || '').toLowerCase();
            const sku = (i.sku || '').toLowerCase();
            const category = (i.category || '').toLowerCase();
            const supplier = (i.suppliers?.name || i.supplier_name || '').toLowerCase();
            return name.includes(currentQuery) || sku.includes(currentQuery) || category.includes(currentQuery) || supplier.includes(currentQuery);
        });
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

    if (pagedItems.length === 0) {
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="py-12 text-center text-gray-400 text-sm font-medium">
                        <div class="flex flex-col items-center justify-center gap-2">
                            <i data-lucide="package-open" class="w-8 h-8 text-gray-300 dark:text-gray-600"></i>
                            <p>No ${isServicesTab ? 'service offerings' : 'inventory items'} found matching the selected filter</p>
                            <button type="button" onclick="window.resyncCentralInventory()" class="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl text-xs transition-all cursor-pointer border border-gray-200 dark:border-gray-700 shadow-2xs">
                                <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i>
                                <span>Re-sync Catalog</span>
                            </button>
                        </div>
                    </td>
                </tr>`;
            if (window.lucide) window.lucide.createIcons();
        }
    } else if (isServicesTab) {
        if (tbody) {
            tbody.innerHTML = pagedItems.map(i => {
                const isChecked = window.selectedCentralItemIds.has(i.id);
                const safeName = (i.name || '').replace(/"/g, '&quot;');
                const retailPrice = Number(i.retail_price || i.price || 0);
                const wholesalePrice = Number(i.wholesale_price || 0);
                const costPrice = Number(i.cost_price || 0);

                return `
                <tr data-central-id="${i.id}" class="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors ${isChecked ? 'bg-purple-50/60 dark:bg-purple-950/40' : ''}">
                    <td class="w-10 px-3 py-3 text-center align-middle">
                        <input type="checkbox" class="central-item-checkbox rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer" value="${i.id}" ${isChecked ? 'checked' : ''} onchange="window.handleCentralItemCheck('${i.id}', this.checked)">
                    </td>
                    <td class="w-[28%] px-4 py-3 align-middle">
                        <div class="font-extrabold text-gray-900 dark:text-white text-sm leading-snug break-words" title="${safeName}">${i.name}</div>
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
                            <i data-lucide="wrench" class="w-3 h-3"></i> Service
                        </span>
                    </td>
                    <td class="w-[20%] px-4 py-3 align-middle">
                        <span class="inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 break-words">${i.category || 'Service'}</span>
                        ${i.sku ? `<div class="text-[11px] font-mono text-gray-500 dark:text-gray-400 mt-1 break-all">Code: ${i.sku}</div>` : ''}
                    </td>
                    <td class="w-[16%] px-4 py-3 text-left align-middle">
                        <span class="font-black text-amber-600 dark:text-amber-400 text-xs sm:text-sm block">${costPrice > 0 ? window.fmt.currency(costPrice) : '0.00'}</span>
                    </td>
                    <td class="w-[18%] px-4 py-3 text-left align-middle">
                        <div class="font-black text-purple-600 dark:text-purple-400 text-xs sm:text-sm leading-tight">R: ${retailPrice > 0 ? window.fmt.currency(retailPrice) : 'TSh 0'}</div>
                        ${wholesalePrice > 0 ? `<div class="font-black text-teal-600 dark:text-teal-400 text-xs sm:text-sm leading-tight mt-0.5">W: ${window.fmt.currency(wholesalePrice)}</div>` : ''}
                    </td>
                    <td class="w-[18%] px-4 py-3 text-right pr-4 align-middle">
                        <div class="flex flex-wrap items-center justify-end gap-1.5">
                            <button onclick="window.openEditCentralItemModal('${i.id}')" class="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold rounded-lg text-xs transition-all cursor-pointer shadow-2xs border border-purple-200/50" title="Edit service">
                                Edit
                            </button>
                            <button onclick="window.deleteSingleCentralItem('${i.id}', '${i.name.replace(/'/g, "\\'")}')" class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all cursor-pointer" title="Delete">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
        }
    } else {
        if (tbody) {
            tbody.innerHTML = pagedItems.map(i => {
                const isChecked = window.selectedCentralItemIds.has(i.id);
                const safeName = (i.name || '').replace(/"/g, '&quot;');
                const supplierName = i.suppliers?.name || i.supplier_name || null;
                const supplierBtnHtml = supplierName ? `
                    <button type="button" 
                            onclick="window.showSupplierTooltip(event, '${supplierName.replace(/'/g, "\\'")}')"
                            class="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 rounded-md text-[10px] font-bold border border-indigo-200/70 dark:border-indigo-800/70 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-2xs">
                        <i data-lucide="truck" class="w-3 h-3 text-indigo-500"></i>
                        <span>${supplierName}</span>
                    </button>
                ` : '';

                const retailPrice = Number(i.retail_price || i.price || 0);
                const wholesalePrice = Number(i.wholesale_price || 0);

                return `
                <tr data-central-id="${i.id}" class="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors ${isChecked ? 'bg-indigo-50/60 dark:bg-indigo-950/40' : ''}">
                    <td class="w-10 px-3 py-3 text-center align-middle">
                        <input type="checkbox" class="central-item-checkbox rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" value="${i.id}" ${isChecked ? 'checked' : ''} onchange="window.handleCentralItemCheck('${i.id}', this.checked)">
                    </td>
                    <td class="w-[28%] px-4 py-3 align-middle">
                        <div class="font-extrabold text-gray-900 dark:text-white text-sm leading-snug break-words" title="${safeName}">${i.name}</div>
                        ${supplierBtnHtml ? `<div class="mt-1">${supplierBtnHtml}</div>` : ''}
                    </td>
                    <td class="w-[20%] px-4 py-3 align-middle">
                        <span class="inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 break-words">${i.category || 'General'}</span>
                        ${i.sku ? `<div class="text-[11px] font-mono text-gray-500 dark:text-gray-400 mt-1 break-all">SKU: ${i.sku}</div>` : ''}
                    </td>
                    <td class="w-[16%] px-4 py-3 text-left align-middle">
                        <div class="flex items-baseline gap-1.5">
                            <span class="font-black text-indigo-600 dark:text-indigo-400 text-sm">${i.main_store_stock || 0}</span>
                            <span class="text-xs text-gray-400 font-bold">/ ${i.globalQty || 0}</span>
                        </div>
                    </td>
                    <td class="w-[18%] px-4 py-3 text-left align-middle">
                        <div class="font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm leading-tight">R: ${retailPrice > 0 ? window.fmt.currency(retailPrice) : 'TSh 0'}</div>
                        ${wholesalePrice > 0 ? `<div class="font-black text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm leading-tight mt-0.5">W: ${window.fmt.currency(wholesalePrice)}</div>` : ''}
                    </td>
                    <td class="w-[18%] px-4 py-3 text-right pr-4 align-middle">
                        <div class="flex flex-wrap items-center justify-end gap-1.5">
                            <button onclick="window.openCentralRestockModal('${i.id}')" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 shadow-2xs border border-emerald-200/50" title="Restock item">
                                <i data-lucide="package-plus" class="w-3.5 h-3.5 text-emerald-600"></i>
                                <span>Restock</span>
                            </button>
                            <button onclick="window.openDispatchModal('${i.id}', '${i.name.replace(/'/g, "\\'")}', ${i.main_store_stock || 0})" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 font-bold rounded-lg text-xs transition-all cursor-pointer shadow-2xs border border-indigo-200/50" title="Dispatch stock">
                                Dispatch
                            </button>
                            <button onclick="window.openEditCentralItemModal('${i.id}')" class="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 font-bold rounded-lg text-xs transition-all cursor-pointer shadow-2xs border border-amber-200/50" title="Edit item">
                                Edit
                            </button>
                            <button onclick="window.deleteSingleCentralItem('${i.id}', '${i.name.replace(/'/g, "\\'")}')" class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all cursor-pointer" title="Delete">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
        }
    }




    const cardsContainer = document.getElementById('centralInventoryCardsContainer');
    if (cardsContainer) {
        if (pagedItems.length === 0) {
            cardsContainer.innerHTML = `
                <div class="py-12 text-center text-gray-400 text-sm font-medium bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <div class="flex flex-col items-center justify-center gap-1.5">
                        <i data-lucide="package-open" class="w-8 h-8 text-gray-300 dark:text-gray-600"></i>
                        <p>No ${isServicesTab ? 'service offerings' : 'inventory items'} found</p>
                    </div>
                </div>`;
        } else if (isServicesTab) {
            cardsContainer.innerHTML = pagedItems.map(i => {
                const costPrice = Number(i.cost_price || 0);
                const retailPrice = Number(i.retail_price || i.price || 0);
                const wholesalePrice = Number(i.wholesale_price || 0);
                const isChecked = window.selectedCentralItemIds.has(i.id);
                const safeName = (i.name || '').replace(/"/g, '&quot;');

                return `
                <div data-central-id="${i.id}" class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/80 p-3 sm:p-3.5 shadow-xs space-y-2 transition-all ${isChecked ? 'ring-2 ring-purple-500 bg-purple-50/30 dark:bg-purple-950/20' : ''}">
                    <!-- Top Header Row -->
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex items-start gap-2 min-w-0 flex-1">
                            <input type="checkbox" class="central-item-checkbox rounded border-gray-300 text-purple-700 focus:ring-purple-600 w-4 h-4 cursor-pointer mt-0.5 shrink-0" value="${i.id}" ${isChecked ? 'checked' : ''} onchange="window.handleCentralItemCheck('${i.id}', this.checked)">
                            <div class="min-w-0 flex-1">
                                <h4 class="font-extrabold text-purple-900 dark:text-purple-300 text-sm leading-snug break-words" title="${safeName}">${i.name}</h4>
                                <p class="text-[11px] text-gray-400 font-medium break-words">
                                    ${i.sku ? `Code: ${i.sku} · ` : ''}${i.category || 'Service'}
                                </p>
                            </div>
                        </div>
                        <div class="shrink-0">
                            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200">
                                <i data-lucide="wrench" class="w-3 h-3"></i> Service
                            </span>
                        </div>
                    </div>

                    <!-- Divider -->
                    <div class="border-t border-gray-100 dark:border-gray-700/60"></div>

                    <!-- Key Value Rows -->
                    <div class="space-y-1 text-xs">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">ASSIGNED BRANCHES</span>
                            <span class="font-bold text-gray-800 dark:text-gray-200 text-xs">${i.branchCount} branches</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">DIRECT COST BASIS</span>
                            <span class="font-bold text-amber-600 dark:text-amber-400 text-xs">${costPrice > 0 ? window.fmt.currency(costPrice) : '0.00'}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">RETAIL SERVICE FEE</span>
                            <span class="font-black text-purple-600 dark:text-purple-400 text-xs">${retailPrice > 0 ? window.fmt.currency(retailPrice) : 'TSh 0'}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">PARTNER / WHOLESALE FEE</span>
                            <span class="font-black text-teal-600 dark:text-teal-400 text-xs">${wholesalePrice > 0 ? window.fmt.currency(wholesalePrice) : '<span class="text-gray-400 font-normal">Not Set</span>'}</span>
                        </div>
                    </div>

                    <!-- Bottom Action Buttons Row -->
                    <div class="flex items-center justify-between gap-2 pt-0.5">
                        <button type="button" onclick="window.openEditCentralItemModal('${i.id}')" class="flex-1 py-1.5 px-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 font-bold rounded-full text-[11.5px] flex items-center justify-center gap-1 border border-purple-200/60 shadow-2xs transition-all cursor-pointer">
                            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                            <span>Edit</span>
                        </button>
                        <button type="button" onclick="window.deleteSingleCentralItem('${i.id}', '${i.name.replace(/'/g, "\\'")}')" class="flex-1 py-1.5 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 font-bold rounded-full text-[11.5px] flex items-center justify-center gap-1 border border-red-200/60 shadow-2xs transition-all cursor-pointer">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            <span>Delete</span>
                        </button>
                    </div>
                </div>`;
            }).join('');
        } else {
            cardsContainer.innerHTML = pagedItems.map(i => {
                const costPrice = Number(i.cost_price || 0);
                const retailPrice = Number(i.retail_price || i.price || 0);
                const wholesalePrice = Number(i.wholesale_price || 0);
                const isChecked = window.selectedCentralItemIds.has(i.id);
                const safeName = (i.name || '').replace(/"/g, '&quot;');

                return `
                <div data-central-id="${i.id}" class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/80 p-3 sm:p-3.5 shadow-xs space-y-2.5 transition-all ${isChecked ? 'ring-2 ring-red-500 bg-red-50/30 dark:bg-red-950/20' : ''}">
                    <!-- Top Header Row -->
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex items-start gap-2 min-w-0 flex-1">
                            <input type="checkbox" class="central-item-checkbox rounded border-gray-300 text-red-700 focus:ring-red-600 w-4 h-4 cursor-pointer mt-0.5 shrink-0" value="${i.id}" ${isChecked ? 'checked' : ''} onchange="window.handleCentralItemCheck('${i.id}', this.checked)">
                            <div class="min-w-0 flex-1">
                                <h4 class="font-extrabold text-[#780016] dark:text-red-400 text-sm leading-snug break-words" title="${safeName}">${i.name}</h4>
                                <p class="text-[11px] text-gray-400 font-medium break-words">
                                    ${i.sku ? `SKU: ${i.sku} · ` : ''}${i.category || 'General'}
                                </p>
                            </div>
                        </div>
                        <div class="shrink-0 text-right">
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60">
                                ${i.branchCount || 0} branches
                            </span>
                        </div>
                    </div>

                    <!-- Divider -->
                    <div class="border-t border-gray-100 dark:border-gray-700/60"></div>

                    <!-- Key Value Rows -->
                    <div class="space-y-1 text-xs">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">MAIN STORE STOCK</span>
                            <span class="font-black text-indigo-600 dark:text-indigo-400 text-xs">${i.main_store_stock || 0} <span class="text-gray-400 font-normal">/ ${i.globalQty || 0} global</span></span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">COST PRICE (BUYING)</span>
                            <span class="font-bold text-amber-600 dark:text-amber-400 text-xs">${costPrice > 0 ? window.fmt.currency(costPrice) : 'TSh 0'}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">RETAIL PRICE (SELLING)</span>
                            <span class="font-black text-emerald-600 dark:text-emerald-400 text-xs">${retailPrice > 0 ? window.fmt.currency(retailPrice) : 'TSh 0'}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">WHOLESALE PRICE (BULK)</span>
                            <span class="font-black text-indigo-600 dark:text-indigo-400 text-xs">${wholesalePrice > 0 ? window.fmt.currency(wholesalePrice) : '<span class="text-gray-400 font-normal">Not Set</span>'}</span>
                        </div>
                    </div>

                    <!-- Bottom Action Buttons Row -->
                    <div class="flex items-center justify-between gap-1.5 pt-0.5">
                        <button type="button" onclick="window.openCentralRestockModal('${i.id}')" class="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold rounded-full text-[11px] flex items-center justify-center gap-1 border border-emerald-200/60 shadow-2xs transition-all cursor-pointer">
                            <i data-lucide="package-plus" class="w-3.5 h-3.5"></i>
                            <span>Restock</span>
                        </button>
                        <button type="button" onclick="window.openDispatchModal('${i.id}', '${i.name.replace(/'/g, "\\'")}', ${i.main_store_stock || 0})" class="flex-1 py-1.5 px-2 bg-[#780016] hover:bg-[#600012] text-white font-bold rounded-full text-[11px] flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer">
                            <i data-lucide="send" class="w-3.5 h-3.5"></i>
                            <span>Dispatch</span>
                        </button>
                        <button type="button" onclick="window.openEditCentralItemModal('${i.id}')" class="flex-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-bold rounded-full text-[11px] flex items-center justify-center gap-1 border border-amber-200/60 shadow-2xs transition-all cursor-pointer">
                            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                            <span>Edit</span>
                        </button>
                        <button type="button" onclick="window.deleteSingleCentralItem('${i.id}', '${i.name.replace(/'/g, "\\'")}')" class="py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 font-bold rounded-full text-[11px] flex items-center justify-center border border-red-200/60 shadow-2xs transition-all cursor-pointer" title="Delete">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>`;
            }).join('');
        }
    }

    const footer = document.getElementById('centralInventoryPaginationFooter');
    if (footer) {
        footer.innerHTML = `
            <div class="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700/60">
                <p class="text-xs text-gray-500 dark:text-gray-400 font-medium">Showing <span class="font-bold text-gray-900 dark:text-white">${pagedItems.length}</span> of <span class="font-bold text-gray-900 dark:text-white">${totalItems}</span> ${isServicesTab ? 'service' : 'catalog'} items</p>
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

    if (window.lucide) window.lucide.createIcons();
};

window.selectedCentralItemIds = window.selectedCentralItemIds || new Set();

window.handleCentralItemCheck = function(itemId, isChecked) {
    if (isChecked) {
        window.selectedCentralItemIds.add(itemId);
    } else {
        window.selectedCentralItemIds.delete(itemId);
    }
    window.updateCentralSelectionUI();
};

window.toggleSelectAllCentralItems = function(isChecked) {
    const paged = window.currentFilteredCentralInventory || [];
    const pageState = window.centralInventoryPageState || { page: 1, pageSize: 20 };
    const startIndex = (pageState.page - 1) * pageState.pageSize;
    const pagedItems = paged.slice(startIndex, startIndex + pageState.pageSize);

    pagedItems.forEach(i => {
        if (isChecked) {
            window.selectedCentralItemIds.add(i.id);
        } else {
            window.selectedCentralItemIds.delete(i.id);
        }
    });
    window.updateCentralSelectionUI();
};

window.selectAllFullCatalogue = function() {
    const all = window.currentFilteredCentralInventory || window._cachedCentralItems || [];
    all.forEach(i => window.selectedCentralItemIds.add(i.id));
    window.updateCentralSelectionUI();
    if (typeof window.showToast === 'function') {
        window.showToast(`Selected all ${all.length} items across all pages!`, 'info');
    }
};

window.clearCentralSelection = function() {
    window.selectedCentralItemIds.clear();
    const selectAllDesktop = document.getElementById('selectAllCentralItems');
    const selectAllMobile = document.getElementById('selectAllCentralItemsMobile');
    const selectAllCbModal = document.getElementById('modalSelectAllCentralItems');
    if (selectAllDesktop) { selectAllDesktop.checked = false; selectAllDesktop.indeterminate = false; }
    if (selectAllMobile) { selectAllMobile.checked = false; }
    if (selectAllCbModal) { selectAllCbModal.checked = false; selectAllCbModal.indeterminate = false; }
    window.updateCentralSelectionUI();
};

window.invertCentralSelection = function() {
    const all = window.currentFilteredCentralInventory || window._cachedCentralItems || [];
    all.forEach(i => {
        if (window.selectedCentralItemIds.has(i.id)) {
            window.selectedCentralItemIds.delete(i.id);
        } else {
            window.selectedCentralItemIds.add(i.id);
        }
    });
    window.updateCentralSelectionUI();
};

window.selectCentralItemsByCategory = function(catName) {
    const all = window.currentFilteredCentralInventory || window._cachedCentralItems || [];
    const matched = all.filter(i => (i.category || 'General').toLowerCase().trim() === catName.toLowerCase().trim());
    matched.forEach(i => window.selectedCentralItemIds.add(i.id));
    window.updateCentralSelectionUI();
    if (typeof window.showToast === 'function') {
        window.showToast(`Selected ${matched.length} item(s) in category "${catName}"!`, 'info');
    }
};

let _lastCheckedIndex = null;
window.handleCentralItemCheckWithEvent = function(e, itemId, isChecked, index) {
    window.handleCentralItemCheck(itemId, isChecked);
    const visibleItems = window.currentFilteredCentralInventory || window._cachedCentralItems || [];
    if (e && e.shiftKey && _lastCheckedIndex !== null && index !== undefined && visibleItems.length > 0) {
        const start = Math.min(_lastCheckedIndex, index);
        const end = Math.max(_lastCheckedIndex, index);
        for (let idx = start; idx <= end; idx++) {
            const itm = visibleItems[idx];
            if (itm) {
                if (isChecked) {
                    window.selectedCentralItemIds.add(itm.id);
                } else {
                    window.selectedCentralItemIds.delete(itm.id);
                }
            }
        }
        window.updateCentralSelectionUI();
    }
    _lastCheckedIndex = index;
};

window.updateCentralSelectionUI = function() {
    const checkboxes = document.querySelectorAll('.central-item-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = window.selectedCentralItemIds.has(cb.value);
        const row = cb.closest('tr');
        if (row) {
            if (cb.checked) {
                row.classList.add('bg-indigo-50/60', 'dark:bg-indigo-950/40');
            } else {
                row.classList.remove('bg-indigo-50/60', 'dark:bg-indigo-950/40', 'bg-purple-50/60', 'dark:bg-purple-950/40');
            }
        }
        const card = cb.closest('[data-central-id]');
        if (card && card.tagName !== 'TR') {
            if (cb.checked) {
                card.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-50/40', 'dark:bg-indigo-950/30');
            } else {
                card.classList.remove('ring-2', 'ring-indigo-500', 'ring-purple-500', 'bg-indigo-50/40', 'dark:bg-indigo-950/30', 'bg-purple-50/40', 'dark:bg-purple-950/30');
            }
        }
    });

    const paged = window.currentFilteredCentralInventory || [];
    const totalCount = paged.length;
    const pageState = window.centralInventoryPageState || { page: 1, pageSize: 20 };
    const startIndex = (pageState.page - 1) * pageState.pageSize;
    const pagedItems = paged.slice(startIndex, startIndex + pageState.pageSize);
    const selectedCount = window.selectedCentralItemIds.size;
    const pagedSelectedCount = pagedItems.filter(i => window.selectedCentralItemIds.has(i.id)).length;
    const allPageChecked = pagedItems.length > 0 && pagedSelectedCount === pagedItems.length;
    const somePageChecked = pagedSelectedCount > 0 && pagedSelectedCount < pagedItems.length;

    const selectAllDesktop = document.getElementById('selectAllCentralItems');
    const selectAllMobile = document.getElementById('selectAllCentralItemsMobile');
    const selectAllModal = document.getElementById('modalSelectAllCentralItems');

    if (selectAllDesktop) {
        selectAllDesktop.checked = allPageChecked;
        selectAllDesktop.indeterminate = somePageChecked;
    }
    if (selectAllMobile) {
        selectAllMobile.checked = allPageChecked;
    }
    if (selectAllModal) {
        selectAllModal.checked = allPageChecked;
        selectAllModal.indeterminate = somePageChecked;
    }

    // Cross-Page Selection Banner
    const crossPageBanner = document.getElementById('centralCrossPageSelectBanner');
    const crossPageText = document.getElementById('centralCrossPageSelectText');
    if (crossPageBanner && crossPageText) {
        if (allPageChecked && totalCount > pagedItems.length && selectedCount < totalCount) {
            crossPageBanner.classList.remove('hidden');
            crossPageText.textContent = `All ${pagedItems.length} items on this page are selected.`;
        } else {
            crossPageBanner.classList.add('hidden');
        }
    }

    // Floating Bulk Action Bar
    const bar = document.getElementById('centralBulkActionsBar');
    const barModal = document.getElementById('centralBulkActionsBarModal');
    const countText = document.getElementById('centralSelectedCountText');
    const countTextModal = document.getElementById('centralSelectedCountTextModal');

    if (bar && countText) {
        if (selectedCount > 0) {
            bar.classList.remove('hidden');
            countText.textContent = `${selectedCount} ${selectedCount === 1 ? 'item' : 'items'} selected across catalogue`;
        } else {
            bar.classList.add('hidden');
        }
    }
    if (barModal && countTextModal) {
        if (selectedCount > 0) {
            barModal.classList.remove('hidden');
            countTextModal.textContent = `${selectedCount} ${selectedCount === 1 ? 'item' : 'items'} selected`;
        } else {
            barModal.classList.add('hidden');
        }
    }

    const countBadge = document.getElementById('selectedCountMobileBadge');
    if (countBadge) {
        countBadge.textContent = selectedCount > 0 ? `${selectedCount} selected` : '';
    }
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

window.openDispatchModal = async function(centralItemId, itemName, currentStock, initialTab = 'dispatch', preselectBranchId = null) {
    window.showLoader('Loading stock operations...');
    try {
        const ownerId = window.state?.ownerId;
        let branches = window.state?.branches || [];
        if (!branches || branches.length === 0) {
            try {
                if (dbBranches && typeof dbBranches.fetchAll === 'function') {
                    branches = await dbBranches.fetchAll(ownerId);
                } else if (window.dbBranches && typeof window.dbBranches.fetchAll === 'function') {
                    branches = await window.dbBranches.fetchAll(ownerId);
                }
            } catch (bErr) {
                console.warn('[openDispatchModal] Failed to fetch branches:', bErr);
            }
        }

        const branchStockMap = {};
        let resolvedStock = Number(currentStock) || 0;

        try {
            const [centralItem, branchRows] = await Promise.all([
                (dbCentralInventory?.fetchOne ? dbCentralInventory.fetchOne(centralItemId) : (window.dbCentralInventory?.fetchOne ? window.dbCentralInventory.fetchOne(centralItemId) : Promise.resolve(null))).catch(() => null),
                dbBranches.fetchAll(state.ownerId).catch(() => [])
            ]);


            if (centralItem && centralItem.main_store_stock !== undefined) {
                resolvedStock = Number(centralItem.main_store_stock) || 0;
            }

            if (branchRows.length > 0) {
                const invPromises = branchRows.map(b => dbInventory.fetchAll(b.id).catch(() => ({ items: [] })));
                const allInvResults = await Promise.all(invPromises);
                allInvResults.forEach((invRes, idx) => {
                    const bId = branchRows[idx].id;
                    const items = Array.isArray(invRes) ? invRes : (invRes.items || []);
                    const matched = items.find(i => (i.central_item_id && String(i.central_item_id) === String(centralItemId)) || (i.id && String(i.id) === String(centralItemId)));
                    if (matched) {
                        branchStockMap[bId] = Number(matched.quantity) || 0;
                    }
                });
            }
        } catch (invErr) {
            console.warn('[openDispatchModal] Failed to fetch inventory rows:', invErr);
        }


        if (preselectBranchId && window._branchDetailsData && window._branchDetailsData.id === preselectBranchId) {
            const bItem = (window._branchDetailsData._inventory || []).find(i => i.central_item_id === centralItemId || i.id === centralItemId);
            if (bItem && bItem.quantity !== undefined) {
                branchStockMap[preselectBranchId] = Number(bItem.quantity) || 0;
            }
        }

        window._stockOpsBranches = branches || [];
        window._stockOpsBranchMap = branchStockMap;
        window._stockOpsCurrentItem = { id: centralItemId, name: itemName, currentStock: resolvedStock };

        window.renderStockOpsModal(initialTab, preselectBranchId);
    } catch (err) {
        console.error('[openDispatchModal] Error:', err);
        window.showToast('Failed to load stock data: ' + err.message, 'error');
    } finally {
        window.hideLoader();
    }
};

window.openStockOperationsModal = window.openDispatchModal;

window.renderStockOpsModal = function(activeTab = 'dispatch', preselectBranchId = null) {
    const branches = window._stockOpsBranches || [];
    const branchStockMap = window._stockOpsBranchMap || {};
    const item = window._stockOpsCurrentItem || {};

    if (item && item.id) {
        try {
            sessionStorage.setItem('bms_active_stock_ops', JSON.stringify({
                centralItemId: item.id,
                itemName: item.name,
                currentStock: item.currentStock,
                initialTab: activeTab,
                preselectBranchId: preselectBranchId
            }));
        } catch (e) {}
    }

    const safeItemName = (item.name || '').replace(/'/g, "\\'");

    const modalHtml = `
        <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-between z-20">
            <div class="flex items-center gap-3">
                <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i><span>${window.t('back', 'Back')}</span>
                </button>
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl ${activeTab === 'return' ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400' : activeTab === 'transfer' ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400' : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'} flex items-center justify-center">
                        <i data-lucide="${activeTab === 'return' ? 'corner-up-left' : activeTab === 'transfer' ? 'arrow-right-left' : 'truck'}" class="w-4 h-4"></i>
                    </div>
                    <div>
                        <h3 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white">${window.t('stock_operations', 'Stock Operations')}</h3>
                        <p class="text-[11px] text-gray-400 font-medium truncate max-w-[200px] sm:max-w-[280px]">${item.name}</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="p-5 sm:p-6 space-y-4">
            <!-- Mode Switcher Tabs -->
            <div class="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold">
                <button type="button" onclick="window.renderStockOpsModal('dispatch')" class="py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'dispatch' ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'} cursor-pointer">
                    <i data-lucide="truck" class="w-3.5 h-3.5"></i>
                    <span class="truncate">${window.t('dispatch_stock', 'Dispatch')}</span>
                </button>
                <button type="button" onclick="window.renderStockOpsModal('return')" class="py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'return' ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-xs' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'} cursor-pointer">
                    <i data-lucide="corner-up-left" class="w-3.5 h-3.5"></i>
                    <span class="truncate">${window.t('return_stock', 'Return / Recall')}</span>
                </button>
                <button type="button" onclick="window.renderStockOpsModal('transfer')" class="py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'transfer' ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-xs' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'} cursor-pointer">
                    <i data-lucide="arrow-right-left" class="w-3.5 h-3.5"></i>
                    <span class="truncate">${window.t('inter_branch_transfer', 'Transfer')}</span>
                </button>
            </div>

            <!-- Product Overview Card -->
            <div class="bg-slate-50 dark:bg-gray-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-gray-700 flex items-center justify-between gap-3 text-xs">
                <div>
                    <span class="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 block">Product</span>
                    <p class="font-extrabold text-gray-900 dark:text-white text-sm truncate">${item.name}</p>
                </div>
                <div class="text-right">
                    <span class="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 block">Main Store Stock</span>
                    <span class="font-black text-indigo-600 dark:text-indigo-400 text-sm">${(item.currentStock || 0).toLocaleString()} units</span>
                </div>
            </div>

            ${activeTab === 'dispatch' ? `
            <!-- Form 1: Dispatch from Main Store to Branch -->
            <form onsubmit="window.submitDispatchStock(event, '${item.id}')" class="space-y-4 pt-1">
                <div>
                    <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">${window.t('destination_branch', 'Destination Branch')} *</label>
                    <select id="dispatchBranch" required class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                        <option value="">-- ${window.t('select_branch', 'Select Destination Branch')} --</option>
                        ${branches.map(b => {
                            const bStock = branchStockMap[b.id] || 0;
                            return `<option value="${b.id}" ${preselectBranchId === b.id ? 'selected' : ''}>${b.name} (Current branch stock: ${bStock})</option>`;
                        }).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">${window.t('qty_to_dispatch', 'Quantity to Dispatch')} *</label>
                    <input type="text" inputmode="decimal" id="dispatchQty" required placeholder="e.g. 50" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-600 number-format">
                    <p class="text-[11px] text-gray-400 mt-1">Available to dispatch: <span class="font-bold text-indigo-600">${item.currentStock || 0}</span></p>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">Dispatch Notes (Optional)</label>
                    <input type="text" id="dispatchNotes" placeholder="e.g. Regular weekly restock" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500">
                </div>
                <div class="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
                    <button type="button" onclick="closeModal()" class="px-5 py-2.5 font-bold rounded-xl text-xs bg-red-600 text-white hover:bg-red-700 shadow-sm">${window.t('cancel', 'Cancel')}</button>
                    <button type="submit" id="submitDispatchBtn" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5">
                        <i data-lucide="truck" class="w-4 h-4"></i>
                        <span>${window.t('dispatch_stock', 'Dispatch Stock')}</span>
                    </button>
                </div>
            </form>
            ` : activeTab === 'return' ? `
            <!-- Form 2: Return Stock from Branch to Main Store -->
            <form onsubmit="window.submitReturnStockToMain(event, '${item.id}')" class="space-y-4 pt-1">
                <div>
                    <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">${window.t('source_branch', 'Source Branch (Deduct From)')} *</label>
                    <select id="returnBranch" required onchange="window.updateReturnMaxHint(this.value)" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none">
                        <option value="">-- ${window.t('select_branch', 'Select Source Branch')} --</option>
                        ${branches.map(b => {
                            const bStock = branchStockMap[b.id] || 0;
                            return `<option value="${b.id}" ${preselectBranchId === b.id ? 'selected' : ''}>${b.name} (${bStock} in stock)</option>`;
                        }).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">${window.t('qty_to_return', 'Quantity to Return to Main Store')} *</label>
                    <input type="text" inputmode="decimal" id="returnQty" required placeholder="e.g. 20" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none font-bold text-amber-600 number-format">
                    <p id="returnMaxHint" class="text-[11px] text-gray-400 mt-1">Select a branch to see available return quantity.</p>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">${window.t('return_reason', 'Return Reason / Notes')} (Optional)</label>
                    <input type="text" id="returnNotes" placeholder="e.g. Excess stock recall, central consolidation" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500">
                </div>
                <div class="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
                    <button type="button" onclick="closeModal()" class="px-5 py-2.5 font-bold rounded-xl text-xs bg-red-600 text-white hover:bg-red-700 shadow-sm">${window.t('cancel', 'Cancel')}</button>
                    <button type="submit" id="submitReturnBtn" class="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5">
                        <i data-lucide="corner-up-left" class="w-4 h-4"></i>
                        <span>${window.t('return_to_main_store', 'Return to Main Store')}</span>
                    </button>
                </div>
            </form>
            ` : `
            <!-- Form 3: Transfer between Branches -->
            <form onsubmit="window.submitTransferBranchStock(event, '${item.id}')" class="space-y-4 pt-1">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">${window.t('source_branch', 'Source Branch (From)')} *</label>
                        <select id="transferFromBranch" required onchange="window.updateTransferSourceHint(this.value)" class="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none">
                            <option value="">-- From Branch --</option>
                            ${branches.map(b => {
                                const bStock = branchStockMap[b.id] || 0;
                                return `<option value="${b.id}" ${preselectBranchId === b.id ? 'selected' : ''}>${b.name} (${bStock} stock)</option>`;
                            }).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">${window.t('destination_branch', 'Destination Branch (To)')} *</label>
                        <select id="transferToBranch" required class="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none">
                            <option value="">-- To Branch --</option>
                            ${branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">${window.t('qty_to_transfer', 'Quantity to Transfer')} *</label>
                    <input type="text" inputmode="decimal" id="transferQty" required placeholder="e.g. 15" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none font-bold text-purple-600 number-format">
                    <p id="transferMaxHint" class="text-[11px] text-gray-400 mt-1">Select source branch to view available transfer stock.</p>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">${window.t('transfer_reason', 'Transfer Reason / Notes')} (Optional)</label>
                    <input type="text" id="transferNotes" placeholder="e.g. Demand rebalancing between branches" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500">
                </div>
                <div class="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
                    <button type="button" onclick="closeModal()" class="px-5 py-2.5 font-bold rounded-xl text-xs bg-red-600 text-white hover:bg-red-700 shadow-sm">${window.t('cancel', 'Cancel')}</button>
                    <button type="submit" id="submitTransferBtn" class="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5">
                        <i data-lucide="arrow-right-left" class="w-4 h-4"></i>
                        <span>${window.t('inter_branch_transfer', 'Transfer to Branch')}</span>
                    </button>
                </div>
            </form>
            `}
        </div>
    `;
    openModal(modalHtml);

    if (preselectBranchId) {
        if (activeTab === 'return') window.updateReturnMaxHint(preselectBranchId);
        if (activeTab === 'transfer') window.updateTransferSourceHint(preselectBranchId);
    }
};

window.updateReturnMaxHint = function(branchId) {
    const hint = document.getElementById('returnMaxHint');
    if (!hint) return;
    const bStock = (window._stockOpsBranchMap && window._stockOpsBranchMap[branchId]) || 0;
    hint.innerHTML = `Available in selected branch: <span class="font-bold text-amber-600">${bStock} units</span>`;
};

window.updateTransferSourceHint = function(branchId) {
    const hint = document.getElementById('transferMaxHint');
    if (!hint) return;
    const bStock = (window._stockOpsBranchMap && window._stockOpsBranchMap[branchId]) || 0;
    hint.innerHTML = `Available in source branch: <span class="font-bold text-purple-600">${bStock} units</span>`;
};

window.submitDispatchStock = async function(e, centralItemId) {
    e.preventDefault();
    const btn = document.getElementById('submitDispatchBtn');
    if (btn) btn.disabled = true;

    const branchId = document.getElementById('dispatchBranch')?.value;
    const qty = window.fmt.parseNumber(document.getElementById('dispatchQty')?.value || 0);
    const notes = document.getElementById('dispatchNotes')?.value?.trim();

    if (!branchId || qty <= 0) {
        window.showToast('Please select a branch and enter a valid quantity.', 'warning');
        if (btn) btn.disabled = false;
        return;
    }

    try {
        window.showLoader('Dispatching stock to branch...');
        await (dbCentralInventory || window.dbCentralInventory).dispatchStock(centralItemId, branchId, qty, notes);
        closeModal();
        window.showToast('Stock dispatched successfully!', 'success');
        if (typeof window.renderOwnerInventoryModule === 'function') window.renderOwnerInventoryModule();
        if (typeof window.renderCentralInventory === 'function') window.renderCentralInventory();
    } catch (err) {
        window.showToast(err.message, 'error');
    } finally {
        if (btn) btn.disabled = false;
        window.hideLoader();
    }
};

window.submitReturnStockToMain = async function(e, centralItemId) {
    e.preventDefault();
    const btn = document.getElementById('submitReturnBtn');
    if (btn) btn.disabled = true;

    const branchId = document.getElementById('returnBranch')?.value;
    const qty = window.fmt.parseNumber(document.getElementById('returnQty')?.value || 0);
    const notes = document.getElementById('returnNotes')?.value?.trim();

    if (!branchId || qty <= 0) {
        window.showToast('Please select a branch and enter a valid return quantity.', 'warning');
        if (btn) btn.disabled = false;
        return;
    }

    try {
        window.showLoader('Returning stock to Main Store...');
        await (dbCentralInventory || window.dbCentralInventory).returnStockToMain(branchId, centralItemId, qty, notes);
        closeModal();
        window.showToast('Stock returned to Main Store successfully!', 'success');
        if (typeof window.renderOwnerInventoryModule === 'function') window.renderOwnerInventoryModule();
        if (typeof window.renderCentralInventory === 'function') window.renderCentralInventory();
        if (window._branchDetailsData && typeof window.renderBranchDetailsTable === 'function') {
            const item = (window._branchDetailsData._inventory || []).find(i => i.central_item_id === centralItemId || i.id === centralItemId);
            if (item) item.quantity = Math.max(0, (Number(item.quantity) || 0) - qty);
            window.renderBranchDetailsTable();
        }
    } catch (err) {
        window.showToast(err.message, 'error');
    } finally {
        if (btn) btn.disabled = false;
        window.hideLoader();
    }
};

window.submitTransferBranchStock = async function(e, centralItemId) {
    e.preventDefault();
    const btn = document.getElementById('submitTransferBtn');
    if (btn) btn.disabled = true;

    const fromBranchId = document.getElementById('transferFromBranch')?.value;
    const toBranchId = document.getElementById('transferToBranch')?.value;
    const qty = window.fmt.parseNumber(document.getElementById('transferQty')?.value || 0);
    const notes = document.getElementById('transferNotes')?.value?.trim();

    if (!fromBranchId || !toBranchId || fromBranchId === toBranchId || qty <= 0) {
        window.showToast('Please select valid distinct source and destination branches.', 'warning');
        if (btn) btn.disabled = false;
        return;
    }

    try {
        window.showLoader('Transferring stock between branches...');
        await (dbCentralInventory || window.dbCentralInventory).transferBranchStock(fromBranchId, toBranchId, centralItemId, qty, notes);
        closeModal();
        window.showToast('Stock transferred to branch successfully!', 'success');
        if (typeof window.renderOwnerInventoryModule === 'function') window.renderOwnerInventoryModule();
        if (typeof window.renderCentralInventory === 'function') window.renderCentralInventory();
        if (window._branchDetailsData && typeof window.renderBranchDetailsTable === 'function') {
            const item = (window._branchDetailsData._inventory || []).find(i => i.central_item_id === centralItemId || i.id === centralItemId);
            if (item && window._branchDetailsData.id === fromBranchId) {
                item.quantity = Math.max(0, (Number(item.quantity) || 0) - qty);
            }
            window.renderBranchDetailsTable();
        }
    } catch (err) {
        window.showToast(err.message, 'error');
    } finally {
        if (btn) btn.disabled = false;
        window.hideLoader();
    }
};

window.formatProductRestockOptions = function(items) {
    // Sort: Out of stock first, then Low stock, then normal stock
    const sorted = [...items].sort((a, b) => {
        const stockA = Number(a.main_store_stock) || 0;
        const threshA = Number(a.min_threshold) || 5;
        const stockB = Number(b.main_store_stock) || 0;
        const threshB = Number(b.min_threshold) || 5;

        const isOutA = stockA === 0;
        const isOutB = stockB === 0;
        if (isOutA && !isOutB) return -1;
        if (!isOutA && isOutB) return 1;

        const isLowA = stockA <= threshA;
        const isLowB = stockB <= threshB;
        if (isLowA && !isLowB) return -1;
        if (!isLowA && isLowB) return 1;

        return (a.name || '').localeCompare(b.name || '');
    });

    return sorted.map(p => {
        const stock = Number(p.main_store_stock) || 0;
        const thresh = Number(p.min_threshold) || 5;
        const isOut = stock === 0;
        const isLow = !isOut && stock <= thresh;

        let statusTag = '';
        let icon = 'package';
        if (isOut) {
            statusTag = '[🔴 OUT OF STOCK] ';
            icon = 'alert-octagon';
        } else if (isLow) {
            statusTag = `[🟡 LOW STOCK: ${stock}/${thresh}] `;
            icon = 'alert-triangle';
        } else {
            statusTag = `[🟢 Stock: ${stock}] `;
            icon = 'check-circle';
        }

        const skuInfo = p.sku ? ` (${p.sku})` : '';
        const catInfo = p.category ? ` · ${p.category}` : '';

        return {
            value: p.id,
            label: `${statusTag}${p.name}${skuInfo}${catInfo}`,
            icon: icon
        };
    });
};

window.renderStockStatusBadge = function(stock, minThreshold = 5) {
    const isOut = stock === 0;
    const isLow = !isOut && stock <= minThreshold;

    if (isOut) {
        return `<span class="restock-current-stock-badge inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 font-bold border border-red-300 dark:border-red-800 text-xs shadow-2xs"><i data-lucide="alert-octagon" class="w-3.5 h-3.5"></i> Out of Stock (0)</span>`;
    }
    if (isLow) {
        return `<span class="restock-current-stock-badge inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800 text-xs shadow-2xs"><i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i> Low Stock (${stock} / min ${minThreshold})</span>`;
    }
    return `<span class="restock-current-stock-badge inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800 text-xs shadow-2xs"><i data-lucide="check-circle" class="w-3.5 h-3.5"></i> In Stock (${stock})</span>`;
};

window.openCentralRestockView = async function(preselectedItemIds = null) {
    sessionStorage.setItem('bms_central_subview', 'restock_hub');
    sessionStorage.setItem('bms_last_active_view', 'central_restock');
    state.activeView = 'central_restock';
    if (preselectedItemIds) {
        sessionStorage.setItem('bms_central_restock_items', JSON.stringify(preselectedItemIds));
    }

    const container = document.getElementById('mainContent');
    if (!container) return;

    try {
        window.showLoader('Loading restock interface...');
        const ownerId = window.state.ownerId;
        const [items, suppliers, capitalAccounts] = await Promise.all([
            window.dbCentralInventory.fetchAll(ownerId).catch(() => []),
            window.dbSuppliers.fetchAll(ownerId).catch(() => []),
            window.dbCapital.fetchAccounts(ownerId).catch(() => [])
        ]);
        window.hideLoader();

        const productItems = items.filter(i => (i.item_type || 'product') === 'product' && !((i.category && String(i.category).toLowerCase().includes('service')) || (i.unit && String(i.unit).toLowerCase() === 'service')));
        if (productItems.length === 0) {
            window.showToast('No inventory products available to restock. Please register products first.', 'info');
            sessionStorage.removeItem('bms_central_subview');
            sessionStorage.removeItem('bms_central_restock_items');
            if (window.switchView) window.switchView('central_inventory');
            return;
        }

        window._restockCatalogItems = productItems;
        window._restockFormattedOptions = window.formatProductRestockOptions(productItems);

        // Count low/out of stock items
        const lowOrOutCount = productItems.filter(i => (Number(i.main_store_stock) || 0) <= (Number(i.min_threshold) || 5)).length;

        // Normalise preselected items (can be a string, array of strings, or null)
        let initialItemIds = [];
        if (Array.isArray(preselectedItemIds)) {
            initialItemIds = preselectedItemIds.filter(id => productItems.some(p => p.id === id));
        } else if (typeof preselectedItemIds === 'string' && preselectedItemIds) {
            if (productItems.some(p => p.id === preselectedItemIds)) {
                initialItemIds = [preselectedItemIds];
            }
        }

        if (initialItemIds.length === 0) {
            initialItemIds = [window._restockFormattedOptions[0]?.value || productItems[0].id];
        }

        const supplierOptions = [
            { value: '', label: '-- No Specific Supplier --', icon: 'minus-circle' },
            ...suppliers.map(s => ({
                value: s.id,
                label: `${s.name}${s.phone ? ' (' + s.phone + ')' : ''}`,
                icon: 'truck'
            }))
        ];

        const capitalOptions = [
            { value: '', label: '-- Do Not Deduct from Capital (Record Only) --', icon: 'minus-circle' },
            ...capitalAccounts.map(c => ({
                value: c.id,
                label: `${c.account_name} (${c.account_type || 'Account'} · Bal: ${window.fmt.currency(c.balance || 0)})`,
                icon: 'wallet'
            }))
        ];

        const supplierDropdownHtml = window.renderPremiumSelect ? window.renderPremiumSelect({
            id: 'restockSupplier',
            selectedValue: '',
            searchable: suppliers.length > 3,
            classes: 'w-full text-xs font-bold bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl',
            options: supplierOptions
        }) : '';

        const capitalDropdownHtml = window.renderPremiumSelect ? window.renderPremiumSelect({
            id: 'restockCapitalAccount',
            selectedValue: '',
            searchable: capitalAccounts.length > 3,
            classes: 'w-full text-xs font-bold bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl',
            options: capitalOptions
        }) : '';

        window._restockRowCounter = 0;

        container.innerHTML = `
        <div class="space-y-4 sm:space-y-6 pb-28 sm:pb-32" id="centralRestockShell">
            <!-- Header Strip -->
            <div class="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <button type="button" onclick="sessionStorage.removeItem('bms_central_subview'); sessionStorage.removeItem('bms_central_restock_items'); switchView('central_inventory')" class="p-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl transition-all cursor-pointer">
                        <i data-lucide="arrow-left" class="w-5 h-5"></i>
                    </button>
                    <div class="w-11 h-11 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center shrink-0">
                        <i data-lucide="package-plus" class="w-6 h-6 text-emerald-600 dark:text-emerald-400"></i>
                    </div>
                    <div>
                        <h2 class="text-lg sm:text-xl font-black text-gray-900 dark:text-white">${window.t('restock_modal_title', 'Restock Central Inventory')}</h2>
                        <p class="text-xs text-gray-500 dark:text-gray-400 font-medium">Receive single or batch purchase shipments with supplier & cost valuation</p>
                    </div>
                </div>
            </div>

            <form onsubmit="window.saveCentralRestock(event)" class="space-y-4 sm:space-y-5">
                <!-- Supplier, Invoice & Capital Account Top Section -->
                <div class="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 space-y-4 shadow-sm">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <div class="flex items-center justify-between mb-1.5">
                                <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">${window.t('supplier_select', 'Supplier / Vendor')}</label>
                                <button type="button" onclick="window.openNewSupplierQuickModal?.()" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">+ New Supplier</button>
                            </div>
                            ${supplierDropdownHtml}
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('invoice_ref', 'Invoice / Delivery Reference')}</label>
                            <input type="text" id="restockRefNo" placeholder="e.g. INV-2026-8902 / Delivery Note" class="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none">
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('payment_source', 'Payment / Capital Deduction (Optional)')}</label>
                        ${capitalDropdownHtml}
                    </div>
                </div>

                <!-- Batch Restock Items Table / List Header -->
                <div class="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 space-y-4 shadow-sm">
                    <div class="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                        <label class="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                            Restock Items in Batch (<span id="restockBatchItemsCount">${initialItemIds.length}</span>)
                        </label>
                        <div class="flex items-center gap-2">
                            ${lowOrOutCount > 0 ? `
                            <button type="button" onclick="window.addAllLowStockToRestock()" class="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-amber-200/60 shadow-2xs" title="Auto-load all items requiring replenishment">
                                <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-amber-600"></i>
                                <span>Add All Low/Out Items (${lowOrOutCount})</span>
                            </button>
                            ` : ''}
                            <button type="button" onclick="window.addRestockBatchRow()" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-indigo-200/60 shadow-2xs">
                                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                                <span>Add Product</span>
                            </button>
                        </div>
                    </div>

                    <div id="restockBatchRowsContainer" class="space-y-3">
                        <!-- Injected dynamically -->
                    </div>
                </div>

                <!-- Live Calculation Bento Grid Card -->
                <div class="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 grid grid-cols-2 sm:grid-cols-3 gap-3 shadow-sm">
                    <div>
                        <span class="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-tight block">Total Products</span>
                        <span id="batchTotalProductsDisplay" class="text-base sm:text-lg font-black text-emerald-950 dark:text-emerald-100">0 items</span>
                    </div>
                    <div>
                        <span class="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-tight block">Total Units to Receive</span>
                        <span id="batchTotalUnitsDisplay" class="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">0 units</span>
                    </div>
                    <div class="col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-emerald-200/60 dark:border-emerald-800/60 pt-2 sm:pt-0 sm:pl-4">
                        <span class="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-tight block">Total Investment</span>
                        <span id="batchTotalCostDisplay" class="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">TSh 0</span>
                    </div>
                </div>

                <!-- Notes / Remarks -->
                <div class="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm">
                    <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Restock Notes / Remarks</label>
                    <textarea id="restockNotes" rows="2" placeholder="Optional comments on shipment, batch number, or container details..." class="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"></textarea>
                </div>

                <!-- Action Buttons -->
                <div class="flex items-center justify-end gap-3 pt-2">
                    <button type="button" onclick="sessionStorage.removeItem('bms_central_subview'); sessionStorage.removeItem('bms_central_restock_items'); switchView('central_inventory')" class="px-5 py-2.5 font-bold rounded-xl transition-all text-xs sm:text-sm bg-red-600 text-white hover:bg-red-700 shadow-sm cursor-pointer">${window.t('cancel', 'Cancel')}</button>
                    <button type="submit" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-600/20 transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer">
                        <i data-lucide="package-plus" class="w-4 h-4"></i>
                        <span>${window.t('confirm_restock', 'Confirm Restock')}</span>
                    </button>
                </div>
            </form>
        </div>
        `;

        // Populate initial rows
        const rowsContainer = document.getElementById('restockBatchRowsContainer');
        if (rowsContainer) {
            rowsContainer.innerHTML = '';
            initialItemIds.forEach(id => {
                window.addRestockBatchRow(id);
            });
        }

        window.calcRestockFinancials();
        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        window.hideLoader();
        window.showToast('Error opening restock interface: ' + err.message, 'error');
    }
};

window.openCentralRestockModal = window.openCentralRestockView;

window.addAllLowStockToRestock = function() {
    const items = window._restockCatalogItems || [];
    const lowOrOutItems = items.filter(i => {
        if (i.item_type === 'service' || (i.category && String(i.category).toLowerCase().includes('service')) || (i.unit && String(i.unit).toLowerCase() === 'service')) {
            return false;
        }
        const stock = Number(i.main_store_stock) || 0;
        const thresh = Number(i.min_threshold) || 5;
        return stock <= thresh;
    });

    if (lowOrOutItems.length === 0) {
        window.showToast('No low or out of stock items found! All products are well-stocked.', 'info');
        return;
    }

    const container = document.getElementById('restockBatchRowsContainer');
    if (container) {
        container.innerHTML = '';
        lowOrOutItems.forEach(item => {
            window.addRestockBatchRow(item.id);
        });
        window.showToast(`Loaded ${lowOrOutItems.length} low/out-of-stock products for batch restock.`, 'success');
    }
};

window.addRestockBatchRow = function(selectedItemId = null) {
    const container = document.getElementById('restockBatchRowsContainer');
    if (!container) return;

    window._restockRowCounter = (window._restockRowCounter || 0) + 1;
    const rowCounter = window._restockRowCounter;
    const rowId = 'restock_row_' + rowCounter;
    const selectId = 'restock_item_select_' + rowCounter;
    const items = window._restockCatalogItems || [];
    const formattedOptions = window._restockFormattedOptions || [];

    const defaultItemId = selectedItemId || (formattedOptions[0]?.value || items[0]?.id || '');
    const item = items.find(i => i.id === defaultItemId) || items[0] || {};

    const currentStock = Number(item.main_store_stock) || 0;
    const costPrice = Number(item.cost_price) || 0;
    const minThreshold = Number(item.min_threshold) || 5;

    const selectHtml = window.renderPremiumSelect ? window.renderPremiumSelect({
        id: selectId,
        selectedValue: defaultItemId,
        searchable: true,
        classes: 'w-full text-xs font-bold bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl',
        options: formattedOptions,
        onChange: `window.onRestockRowProductChange('${rowId}', this.value)`
    }) : '';

    const rowHtml = document.createElement('div');
    rowHtml.id = rowId;
    rowHtml.className = 'restock-item-row bg-white dark:bg-gray-900 p-3.5 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs space-y-3 transition-all';
    rowHtml.innerHTML = `
        <div class="flex items-center justify-between gap-2">
            <div class="flex-1 min-w-0">
                <label class="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Select Product *</label>
                ${selectHtml}
            </div>
            <div class="pt-5 shrink-0">
                <button type="button" onclick="window.removeRestockBatchRow('${rowId}')" class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer" title="Remove product from batch">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end text-xs pt-1 border-t border-gray-100 dark:border-gray-800">
            <div>
                <span class="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight mb-1">Current Status</span>
                <div class="status-badge-wrapper">${window.renderStockStatusBadge(currentStock, minThreshold)}</div>
            </div>

            <div>
                <label class="block text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight mb-1">Qty to Add (+ Units) *</label>
                <input type="text" inputmode="decimal" class="restock-qty-input w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-black text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none number-format" placeholder="e.g. 50" oninput="window.calcRestockFinancials()">
            </div>

            <div>
                <label class="block text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight mb-1">Unit Cost (${window.fmt ? window.fmt.getSymbol() : 'TSh'}) *</label>
                <input type="text" inputmode="decimal" value="${costPrice ? window.fmt.number(costPrice) : ''}" class="restock-cost-input w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-black text-amber-600 dark:text-amber-400 focus:ring-2 focus:ring-amber-500 outline-none number-format" placeholder="0.00" oninput="window.calcRestockFinancials()">
            </div>

            <div>
                <span class="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight mb-1">Line Investment</span>
                <span class="restock-line-total font-black text-gray-900 dark:text-white text-xs block py-2">TSh 0</span>
            </div>
        </div>
    `;

    container.appendChild(rowHtml);
    if (window.lucide) window.lucide.createIcons();
    window.calcRestockFinancials();
};

window.removeRestockBatchRow = function(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    const container = document.getElementById('restockBatchRowsContainer');
    const totalRows = container?.querySelectorAll('.restock-item-row').length || 0;
    if (totalRows <= 1) {
        window.showToast('Batch restock must have at least one product.', 'info');
        return;
    }
    row.remove();
    window.calcRestockFinancials();
};

window.onRestockRowProductChange = function(rowId, itemId) {
    const row = document.getElementById(rowId);
    if (!row) return;

    const items = window._restockCatalogItems || [];
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const currentStock = Number(item.main_store_stock) || 0;
    const costPrice = Number(item.cost_price) || 0;
    const minThreshold = Number(item.min_threshold) || 5;

    const badgeWrapper = row.querySelector('.status-badge-wrapper');
    if (badgeWrapper) {
        badgeWrapper.innerHTML = window.renderStockStatusBadge(currentStock, minThreshold);
        if (window.lucide) window.lucide.createIcons();
    }

    const costInput = row.querySelector('.restock-cost-input');
    if (costInput && costPrice > 0) {
        costInput.value = window.fmt.number(costPrice);
    }

    window.calcRestockFinancials();
};

window.calcRestockFinancials = function() {
    const rows = document.querySelectorAll('.restock-item-row');
    let grandTotalCost = 0;
    let grandTotalUnits = 0;
    let validProductsCount = 0;

    rows.forEach(row => {
        const qtyInput = row.querySelector('.restock-qty-input');
        const costInput = row.querySelector('.restock-cost-input');
        const lineTotalEl = row.querySelector('.restock-line-total');

        const qty = window.fmt.parseNumber(qtyInput?.value || 0);
        const cost = window.fmt.parseNumber(costInput?.value || 0);
        const lineTotal = qty * cost;

        if (lineTotalEl) {
            lineTotalEl.textContent = lineTotal > 0 ? window.fmt.currency(lineTotal) : 'TSh 0';
        }

        if (qty > 0) {
            grandTotalUnits += qty;
            grandTotalCost += lineTotal;
            validProductsCount++;
        }
    });

    const countBadge = document.getElementById('restockBatchItemsCount');
    if (countBadge) countBadge.textContent = rows.length;

    const prodDisplay = document.getElementById('batchTotalProductsDisplay');
    if (prodDisplay) prodDisplay.textContent = `${validProductsCount || rows.length} items`;

    const unitsDisplay = document.getElementById('batchTotalUnitsDisplay');
    if (unitsDisplay) unitsDisplay.textContent = `${grandTotalUnits} units`;

    const costDisplay = document.getElementById('batchTotalCostDisplay');
    if (costDisplay) costDisplay.textContent = grandTotalCost > 0 ? window.fmt.currency(grandTotalCost) : 'TSh 0';
};

window.saveCentralRestock = async function(event) {
    event.preventDefault();
    const rows = document.querySelectorAll('.restock-item-row');
    const items = [];

    rows.forEach(row => {
        const hiddenInput = row.querySelector('input[id^="restock_item_select_"]');
        const itemId = hiddenInput?.value;
        const qty = window.fmt.parseNumber(row.querySelector('.restock-qty-input')?.value || 0);
        const unitCost = window.fmt.parseNumber(row.querySelector('.restock-cost-input')?.value || 0);

        if (itemId && qty > 0) {
            items.push({
                item_id: itemId,
                quantity: qty,
                cost_price: unitCost
            });
        }
    });

    if (items.length === 0) {
        window.showToast('Please enter restock quantities for at least one item.', 'warning');
        return;
    }

    const supplierId = document.getElementById('restockSupplier')?.value || null;
    const referenceNo = document.getElementById('restockRefNo')?.value?.trim() || null;
    const capitalAccountId = document.getElementById('restockCapitalAccount')?.value || null;
    const notes = document.getElementById('restockNotes')?.value?.trim() || null;

    try {
        window.showLoader(`Recording batch restock (${items.length} products)...`);
        const res = await window.dbCentralInventory.batchRestock({
            items,
            supplier_id: supplierId,
            reference_no: referenceNo,
            capital_account_id: capitalAccountId,
            notes,
            owner_id: window.state.ownerId
        });

        sessionStorage.removeItem('bms_central_subview');
        sessionStorage.removeItem('bms_central_restock_items');
        window.showToast(`Batch restock completed! Added ${res.totalUnits} units across ${res.count} products.`, 'success');

        // Clear local caches and re-render
        window._cachedCentralItems = null;
        window.selectedCentralItemIds?.clear();
        if (window.switchView) {
            window.switchView('central_inventory');
        } else if (window.renderOwnerInventoryModule) {
            await window.renderOwnerInventoryModule();
        }
    } catch (err) {
        window.showToast('Failed to complete batch restock: ' + err.message, 'error');
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

window.downloadServicesCSVTemplate = function () {
    const headers = [
        'name',
        'category',
        'service_price',
        'cost_price',
        'description'
    ];
    const instructions = [
        "INSTRUCTIONS: Fill in your service offering details into the columns on the LEFT.",
        "REQUIRED FIELDS: 'name' and 'service_price'.",
        "DO NOT DELETE OR MODIFY THE HEADER NAMES OR THIS RIGHT-HAND INSTRUCTION COLUMN.",
        "The system automatically parses data on the left and ignores this right column.",
        "COLUMN GUIDE:",
        "• name: Service Name / Title (e.g. Full Synthetic Oil Change, Haircut & Grooming)",
        "• category: Service Category (e.g. Automotive, Salon, Consulting)",
        "• service_price: Service Price / Amount Charged to Customer (e.g. 45000)",
        "• cost_price: Direct Service Cost / Operational Expenses (Optional, default 0)",
        "• description: Service Notes / Offering Details (Optional)"
    ];

    const sampleRows = [
        ['Oil Change & Filter', 'Automotive', '45000', '15000', 'Standard service with filter replacement'],
        ['Haircut & Grooming', 'Salon & Spa', '25000', '0', 'Full styling and grooming session']
    ];

    window.downloadCSVTemplate('services_catalog_template.csv', headers, instructions, sampleRows);
};

window.importServicesCSV = function () {
    window.triggerCSVUpload(async (data) => {
        if (!data || data.length === 0) {
            window.showToast('CSV / Excel file is empty or invalid', 'error');
            return;
        }

        window.showLoader('Importing service offerings...');
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

                const name = getVal('name', 'servicename', 'service_name', 'itemname', 'item_name', 'title') || '';
                const category = getVal('category', 'cat', 'service_category') || 'General Services';
                const servicePrice = fmt.parseNumber(getVal('service_price', 'serviceprice', 'selling_price', 'sellingprice', 'price', 'retail_price', 'retailprice', 'rate', 'fee') || 0);
                const costPrice = fmt.parseNumber(getVal('cost_price', 'costprice', 'direct_cost', 'directcost', 'cost', 'expense', 'expenses', 'purchase_price') || 0);
                const description = getVal('description', 'notes', 'details') || '';
                const autoGeneratedSku = `SRV-${Date.now().toString().slice(-6)}-${successCount + 1}`;

                if (!name || name === 'Unnamed Item') {
                    continue; // Skip blank instruction overflow rows
                }

                try {
                    if (category && window.dbCategories && state.ownerId) {
                        await window.dbCategories.ensureCategory(state.ownerId, category, 'service').catch(() => {});
                    }

                    const centralItem = await window.dbCentralInventory.add({
                        owner_id: window.state.ownerId,
                        name,
                        sku: autoGeneratedSku,
                        category,
                        cost_price: costPrice,
                        price: servicePrice,
                        retail_price: servicePrice,
                        wholesale_price: servicePrice,
                        min_threshold: 0,
                        main_store_stock: 0,
                        item_type: 'service',
                        unit: null,
                        description
                    });

                    if (centralItem && branches && branches.length > 0) {
                        const branchPayload = {
                            name: centralItem.name,
                            sku: centralItem.sku,
                            category: centralItem.category,
                            cost_price: costPrice,
                            price: servicePrice,
                            retail_price: servicePrice,
                            wholesale_price: servicePrice,
                            min_threshold: 0,
                            quantity: 0,
                            item_type: 'service',
                            central_item_id: centralItem.id,
                            is_from_main_store: true
                        };
                        await Promise.all(branches.map(b => dbInventory.add(b.id, branchPayload)));
                    }
                    successCount++;
                } catch (e) {
                    console.error('[ServicesImport] Failed row:', name, e);
                    failCount++;
                }
            }

            window.hideLoader();

            if (successCount > 0) {
                window.showToast(`Successfully imported ${successCount} service offerings!`, 'success');
                if (typeof window.renderOwnerInventoryModule === 'function') window.renderOwnerInventoryModule();
            } else {
                window.showToast('No valid services found in uploaded file', 'warning');
            }
        } catch (err) {
            window.hideLoader();
            window.showToast('Import error: ' + err.message, 'error');
        }
    });
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
    const activeTab = window.state._inventoryActiveTab || sessionStorage.getItem('bms_inventory_active_tab') || 'inventory';
    const isServicesTab = activeTab === 'services';

    if (!items || items.length === 0) {
        return `<div class="py-12 text-center text-gray-400 text-sm font-semibold">${isServicesTab ? 'No service offerings found matching search or filter' : window.t('no_items_found', 'No items found matching search or filter')}</div>`;
    }

    return items.map(i => {
        const isService = i.item_type === 'service';
        const threshold = i.min_threshold || 5;
        const isOut = !isService && Number(i.globalQty || 0) === 0 && Number(i.main_store_stock || 0) === 0;
        const isLow = !isService && !isOut && (Number(i.globalQty || 0) <= threshold || Number(i.main_store_stock || 0) <= threshold);
        const isChecked = window.selectedCentralItemIds.has(i.id);
        const safeName = (i.name || '').replace(/"/g, '&quot;');
        const supplierName = i.suppliers?.name || i.supplier_name || null;
        const branchCount = i.branchCount !== undefined ? i.branchCount : (i.inventory ? i.inventory.length : 0);

        const costPrice = Number(i.cost_price || 0);
        const retailPrice = Number(i.retail_price || i.price || 0);
        const wholesalePrice = Number(i.wholesale_price || 0);

        if (isService) {
            return `
            <div data-central-id="${i.id}" class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/80 p-3 sm:p-3.5 shadow-xs space-y-2 transition-all ${isChecked ? 'ring-2 ring-purple-500 bg-purple-50/30 dark:bg-purple-950/20' : ''}">
                <!-- Top Header Row -->
                <div class="flex items-start justify-between gap-2">
                    <div class="flex items-start gap-2 min-w-0 flex-1">
                        <input type="checkbox" class="central-item-checkbox rounded border-gray-300 text-purple-700 focus:ring-purple-600 w-4 h-4 cursor-pointer mt-0.5 shrink-0" value="${i.id}" ${isChecked ? 'checked' : ''} onchange="window.handleCentralItemCheck('${i.id}', this.checked)">
                        <div class="min-w-0 flex-1">
                            <h4 class="font-extrabold text-purple-900 dark:text-purple-300 text-sm leading-snug break-words" title="${safeName}">${i.name}</h4>
                            <p class="text-[11px] text-gray-400 font-medium break-words">
                                ${i.sku ? `Code: ${i.sku} · ` : ''}${i.category || 'Service'}
                            </p>
                        </div>
                    </div>
                    <div class="shrink-0">
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200">
                            <i data-lucide="wrench" class="w-3 h-3"></i> Service
                        </span>
                    </div>
                </div>

                <!-- Divider -->
                <div class="border-t border-gray-100 dark:border-gray-700/60"></div>

                <!-- Key Value Rows -->
                <div class="space-y-1 text-xs">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">ASSIGNED BRANCHES</span>
                        <span class="font-bold text-gray-800 dark:text-gray-200 text-xs">${branchCount} branches</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">SERVICE DIRECT COST</span>
                        <span class="font-bold text-amber-600 dark:text-amber-400 text-xs">${costPrice > 0 ? window.fmt.currency(costPrice) : '0.00'}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">SERVICE PRICE (CUSTOMER)</span>
                        <span class="font-black text-purple-600 dark:text-purple-400 text-xs">${retailPrice > 0 ? window.fmt.currency(retailPrice) : 'TSh 0'}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">NET PROFIT MARGIN</span>
                        <span class="font-black text-emerald-600 dark:text-emerald-400 text-xs">${retailPrice > costPrice ? `${window.fmt.currency(retailPrice - costPrice)} (+${Math.round(((retailPrice - costPrice) / (retailPrice || 1)) * 100)}%)` : '0.00'}</span>
                    </div>
                </div>

                <!-- Bottom Action Buttons Row -->
                <div class="flex items-center justify-between gap-2 pt-0.5">
                    <button type="button" onclick="window.closeCentralInventoryModal(); window.openEditCentralItemModal('${i.id}')" class="flex-1 py-1.5 px-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 font-bold rounded-full text-[11.5px] flex items-center justify-center gap-1 border border-purple-200/60 shadow-2xs transition-all cursor-pointer">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                        <span>Edit</span>
                    </button>
                    <button type="button" onclick="window.deleteSingleCentralItem('${i.id}', '${i.name.replace(/'/g, "\\'")}')" class="flex-1 py-1.5 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 font-bold rounded-full text-[11.5px] flex items-center justify-center gap-1 border border-red-200/60 shadow-2xs transition-all cursor-pointer">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        <span>Delete</span>
                    </button>
                </div>
            </div>`;
        }

        return `
        <div data-central-id="${i.id}" class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/80 p-3 sm:p-3.5 shadow-xs space-y-2 transition-all ${isChecked ? 'ring-2 ring-red-500 bg-red-50/30 dark:bg-red-950/20' : ''}">
            <!-- Top Header Row -->
            <div class="flex items-start justify-between gap-2">
                <div class="flex items-start gap-2 min-w-0 flex-1">
                    <input type="checkbox" class="central-item-checkbox rounded border-gray-300 text-red-700 focus:ring-red-600 w-4 h-4 cursor-pointer mt-0.5 shrink-0" value="${i.id}" ${isChecked ? 'checked' : ''} onchange="window.handleCentralItemCheck('${i.id}', this.checked)">
                    <div class="min-w-0 flex-1">
                        <h4 class="font-extrabold text-[#780016] dark:text-red-400 text-sm leading-snug break-words" title="${safeName}">${i.name}</h4>
                        <p class="text-[11px] text-gray-400 font-medium break-words">
                            ${i.sku ? `Code: ${i.sku} · ` : ''}${i.category || 'General'}${supplierName ? ` · ${supplierName}` : ''}
                        </p>
                    </div>
                </div>
                <div class="shrink-0">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${isOut ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200' : isLow ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200'}">
                        ${isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                    </span>
                </div>
            </div>

            <!-- Divider -->
            <div class="border-t border-gray-100 dark:border-gray-700/60"></div>

            <!-- Key Value Rows -->
            <div class="space-y-1 text-xs">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">MAIN STORE STOCK</span>
                    <span class="font-black text-red-700 dark:text-red-400 text-xs">${i.main_store_stock || 0}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">ASSIGNED BRANCHES</span>
                    <span class="font-bold text-gray-800 dark:text-gray-200 text-xs">${branchCount} branches</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">GLOBAL QTY</span>
                    <span class="font-black text-red-700 dark:text-red-400 text-xs">${i.globalQty || 0}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">COST PRICE (BUYING)</span>
                    <span class="font-bold text-amber-600 dark:text-amber-400 text-xs">${costPrice > 0 ? window.fmt.currency(costPrice) : 'TSh 0'}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">RETAIL PRICE (SELLING)</span>
                    <span class="font-black text-emerald-600 dark:text-emerald-400 text-xs">${retailPrice > 0 ? window.fmt.currency(retailPrice) : 'TSh 0'}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">WHOLESALE PRICE (BULK)</span>
                    <span class="font-black text-indigo-600 dark:text-indigo-400 text-xs">${wholesalePrice > 0 ? window.fmt.currency(wholesalePrice) : '<span class="text-gray-400 font-normal">Not Set</span>'}</span>
                </div>
            </div>

            <!-- Bottom Action Buttons Row -->
            <div class="flex items-center justify-between gap-2 pt-0.5">
                <button type="button" onclick="window.closeCentralInventoryModal(); window.openEditCentralItemModal('${i.id}')" class="flex-1 py-1.5 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-bold rounded-full text-[11.5px] flex items-center justify-center gap-1 border border-amber-200/60 shadow-2xs transition-all cursor-pointer">
                    <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                    <span>Edit</span>
                </button>
                <button type="button" onclick="window.closeCentralInventoryModal(); window.openDispatchModal('${i.id}', '${i.name.replace(/'/g, "\\'")}', ${i.main_store_stock || 0})" class="flex-1 py-1.5 px-2.5 bg-[#780016] hover:bg-[#600012] text-white font-bold rounded-full text-[11.5px] flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer">
                    <i data-lucide="send" class="w-3.5 h-3.5"></i>
                    <span>Dispatch</span>
                </button>
                <button type="button" onclick="window.deleteSingleCentralItem('${i.id}', '${i.name.replace(/'/g, "\\'")}')" class="flex-1 py-1.5 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 font-bold rounded-full text-[11.5px] flex items-center justify-center gap-1 border border-red-200/60 shadow-2xs transition-all cursor-pointer">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    <span>Delete</span>
                </button>
            </div>
        </div>`;
    }).join('');
};

window.filterModalCentralInventory = async function(statusVal, searchVal) {
    const searchInput = document.getElementById('modalInvSearchInput');
    const domSearchVal = searchInput ? searchInput.value : '';

    if (statusVal !== undefined && statusVal !== null) {
        if (statusVal === 'healthy') statusVal = 'in_stock';
        if (statusVal === 'low') statusVal = 'low_stock';
        if (statusVal === 'out') statusVal = 'out_of_stock';
        window.state._invStatusFilter = statusVal;
        window.centralInventoryPageState.modalPage = 1;
    }

    if (typeof searchVal === 'string') {
        window.state._invSearch = searchVal;
        if (searchInput && searchInput.value !== searchVal) {
            searchInput.value = searchVal;
        }
        window.centralInventoryPageState.modalPage = 1;
    } else if (searchInput) {
        window.state._invSearch = domSearchVal;
    }

    let items = window._cachedCentralItems;
    if (!items || items.length === 0) {
        const fetchOwnerId = window.state.ownerId;
        if (fetchOwnerId) {
            try {
                items = await window.dbCentralInventory.fetchAll(fetchOwnerId);
                items = items || [];
                await window.populateCentralItemsWithBranchInventory(items, fetchOwnerId);
                window._cachedCentralItems = items;
            } catch (e) {
                console.error('[filterModalCentralInventory] fetch failed', e);
            }
        }
    }
    items = window._cachedCentralItems || [];

    const activeTab = window.state._inventoryActiveTab || sessionStorage.getItem('bms_inventory_active_tab') || 'inventory';
    const isServicesTab = activeTab === 'services';
    const savedStatus = window.state._invStatusFilter || 'all';
    const effectiveSearch = (typeof window.state._invSearch === 'string') ? window.state._invSearch : domSearchVal;
    const currentQuery = effectiveSearch.trim().toLowerCase();

    let filtered = [...items];
    if (isServicesTab) {
        filtered = filtered.filter(i => i.item_type === 'service');
        if (savedStatus === 'assigned') {
            filtered = filtered.filter(i => (i.branchCount || 0) > 0);
        } else if (savedStatus === 'unassigned') {
            filtered = filtered.filter(i => (i.branchCount || 0) === 0);
        }
    } else {
        filtered = filtered.filter(i => (i.item_type || 'product') === 'product');
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
    }

    if (currentQuery) {
        filtered = filtered.filter(i => {
            const name = (i.name || '').toLowerCase();
            const sku = (i.sku || '').toLowerCase();
            const category = (i.category || '').toLowerCase();
            const supplier = (i.suppliers?.name || i.supplier_name || '').toLowerCase();
            return name.includes(currentQuery) || sku.includes(currentQuery) || category.includes(currentQuery) || supplier.includes(currentQuery);
        });
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
                <p class="text-xs text-gray-500 dark:text-gray-400 font-medium">Showing <span class="font-bold text-gray-900 dark:text-white">${pagedItems.length}</span> of <span class="font-bold text-gray-900 dark:text-white">${totalItems}</span> ${isServicesTab ? 'service' : 'inventory'} items</p>
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
    if (initialFilter === 'healthy') initialFilter = 'in_stock';
    if (initialFilter === 'low') initialFilter = 'low_stock';
    if (initialFilter === 'out') initialFilter = 'out_of_stock';
    if (initialFilter) {
        window.state._invStatusFilter = initialFilter;
    } else if (!window.state._invStatusFilter) {
        window.state._invStatusFilter = 'all';
    }

    const activeTab = window.state._inventoryActiveTab || sessionStorage.getItem('bms_inventory_active_tab') || 'inventory';
    const isServicesTab = activeTab === 'services';
    const activeFilter = window.state._invStatusFilter || 'all';
    const activeSearch = window.state._invSearch || '';

    const modalHtml = `
        <div class="flex flex-col h-full bg-slate-50/50 dark:bg-gray-900 overflow-hidden">
            <div class="modal-top-nav flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl ${isServicesTab ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400' : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'} flex items-center justify-center font-bold shrink-0">
                        <i data-lucide="${isServicesTab ? 'wrench' : 'package'}" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">
                            ${isServicesTab ? 'Services & Offerings Catalog' : window.t('inventory_items', 'Inventory Items')}
                        </h3>
                    </div>
                </div>
                <button type="button" onclick="window.closeCentralInventoryModal()" data-close-text="${window.t('exit', 'Exit')}" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <!-- Sticky Fixed Bulk Actions Bar directly below Modal Top Header -->
            <div id="centralBulkActionsBarModal" class="hidden flex-none flex items-center justify-between gap-3 px-4 py-3 bg-rose-50 dark:bg-rose-950/80 border-b-2 border-rose-300 dark:border-rose-700/80 shadow-md z-30 transition-all">
                <div class="flex items-center gap-2.5">
                    <input type="checkbox" id="modalSelectAllCentralItems" onchange="window.toggleSelectAllCentralItems(this.checked)" class="rounded border-rose-400 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer" title="Select All">
                    <p id="centralSelectedCountTextModal" class="text-xs font-black tracking-wide text-rose-950 dark:text-rose-100">0 items selected</p>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" onclick="window.clearCentralSelection()" class="px-2.5 py-1 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-xs">
                        Clear
                    </button>
                    <button type="button" onclick="window.deleteSelectedCentralItems()" class="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-lg text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5 text-white"></i>
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
                    <input type="text" id="modalInvSearchInput" placeholder="${isServicesTab ? 'Search service offerings...' : window.t('search_main_store', 'Search main store...')}" value="${activeSearch}"
                        class="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs sm:text-sm focus:ring-2 ${isServicesTab ? 'focus:ring-purple-500' : 'focus:ring-indigo-500'} outline-none dark:text-white"
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
                        options: isServicesTab ? [
                            { value: 'all', label: 'All Services', icon: 'filter' },
                            { value: 'assigned', label: 'Assigned to Branches', icon: 'check-circle' },
                            { value: 'unassigned', label: 'Unassigned Offerings', icon: 'alert-circle' }
                        ] : [
                            { value: 'all', label: window.t('all_stock_status', 'All Stock Status'), icon: 'filter' },
                            { value: 'in_stock', label: window.t('in_stock', 'In Stock'), icon: 'check-circle' },
                            { value: 'low_stock', label: window.t('low_stock', 'Low Stock'), icon: 'alert-triangle' },
                            { value: 'out_of_stock', label: window.t('out_of_stock', 'Out of Stock'), icon: 'x-circle' },
                            { value: 'performing', label: 'Top Performing', icon: 'trending-up' }
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
        if (!item) throw new Error('Item not found');

        const isService = item.item_type === 'service';
        const [suppliers, categories] = await Promise.all([
            dbSuppliers.fetchAll(state.ownerId).catch(() => []),
            window.dbCategories ? window.dbCategories.fetchAll(state.ownerId, isService ? 'service' : 'product').catch(() => []) : []
        ]);
        const supplierOptions = suppliers.map(s => `
            <option value="${s.id}" ${item.supplier_id === s.id ? 'selected' : ''}>${s.name}</option>
        `).join('');

        const modalHtml = `
            <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
                <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i><span>${window.t('back', 'Back')}</span>
                </button>
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl ${isService ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400' : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'} flex items-center justify-center">
                        <i data-lucide="${isService ? 'wrench' : 'edit-3'}" class="w-4 h-4"></i>
                    </div>
                    <h3 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white">${isService ? 'Edit Service Details' : window.t('edit_stock_item', 'Edit Stock Item')}</h3>
                </div>
            </div>
            <form onsubmit="window.updateCentralItem(event, '${item.id}')" class="flex flex-col flex-1 overflow-hidden">
                <input type="hidden" id="editCiItemType" value="${item.item_type || 'product'}">
                <div class="flex-1 overflow-y-auto p-6 space-y-6">
                    <!-- Basic Details -->
                    <div>
                        <h4 class="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">${isService ? 'Service & Financial Details' : window.t('basic_financial_details', 'Basic & Financial Details')}</h4>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">${isService ? 'Service Name *' : `${window.t('item_name', 'Item Name')} *`}</label>
                                <input type="text" id="editCiName" required value="${item.name.replace(/"/g, '&quot;')}" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('sku_code', 'SKU / Code')}</label>
                                <input type="text" id="editCiSku" value="${item.sku || ''}" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${window.t('category', 'Category')} *</label>
                                ${window.renderPremiumCategorySelect ? window.renderPremiumCategorySelect({
                                    id: 'editCiCategory',
                                    categories,
                                    selectedValue: item.category,
                                    itemType: isService ? 'service' : 'product',
                                    placeholder: isService ? 'Select or type service category...' : 'Select or type category...'
                                }) : `<input type="text" id="editCiCategory" required value="${(item.category || '').replace(/"/g, '&quot;')}" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">`}
                            </div>
                            <div class="${isService ? 'hidden' : ''}">
                                <label class="block text-sm font-medium text-gray-700 mb-1">${window.t('initial_stock', 'Main Store Stock')} *</label>
                                <input type="text" inputmode="decimal" id="editCiMainStoreStock" value="${window.fmt.number(item.main_store_stock || 0)}" ${isService ? '' : 'required'} oninput="window.calcEditCentralFinancials()" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-indigo-600 number-format">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${isService ? 'Service Price (Amount Charged to Customer) *' : `${window.t('selling_prices', 'Selling Prices')} *`}</label>
                                <div class="grid grid-cols-2 gap-2">
                                    <div class="${isService ? 'hidden' : ''}">
                                        <span class="block text-[9px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">${window.t('wholesale', 'Wholesale')}</span>
                                        <input type="text" inputmode="decimal" id="editCiWholesalePrice" ${isService ? '' : 'required'} value="${window.fmt.number(item.wholesale_price ?? item.price ?? 0)}" oninput="window.calcEditCentralFinancials()" class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600 number-format">
                                    </div>
                                    <div class="${isService ? 'col-span-2' : ''}">
                                        <span class="block text-[9px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">${isService ? 'Customer Fee / Selling Rate' : window.t('retail', 'Retail')}</span>
                                        <input type="text" inputmode="decimal" id="editCiRetailPrice" required value="${window.fmt.number(item.retail_price ?? item.price ?? 0)}" oninput="window.calcEditCentralFinancials()" class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-emerald-600 number-format">
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${isService ? 'Service Direct Cost / Expenses (Optional)' : `${window.t('purchase_price', 'Purchase Price per Item (Cost)')} *`}</label>
                                <input type="text" inputmode="decimal" id="editCiCostPrice" value="${window.fmt.number(item.cost_price || 0)}" ${isService ? '' : 'required'} oninput="window.calcEditCentralFinancials()" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-amber-600 number-format">
                                <p class="text-[10px] text-gray-400 mt-1 ${isService ? '' : 'hidden'}">Expenses needed to deliver this service (e.g. paper, ink, electricity, supplies).</p>
                            </div>
                            <div class="${isService ? 'hidden' : ''}">
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
                                <p class="text-[10px] text-gray-500 font-bold uppercase tracking-tight">${isService ? 'Customer Service Price' : window.t('expected_sales_return', 'Expected Sales Value')}</p>
                                <p id="editCalcExpectedSales" class="text-xs sm:text-sm font-black text-emerald-600 whitespace-nowrap">TZS 0</p>
                            </div>
                            <div class="bg-white px-3 py-1.5 rounded-xl border border-slate-200/70 shadow-xs flex items-center justify-between gap-4">
                                <p class="text-[10px] text-gray-500 font-bold uppercase tracking-tight">${isService ? 'Direct Cost Basis' : window.t('total_cost', 'Total Cost')}</p>
                                <p id="editCalcTotalCost" class="text-xs sm:text-sm font-black text-amber-600 whitespace-nowrap">TZS 0</p>
                            </div>
                            <div class="bg-white px-3 py-1.5 rounded-xl border border-slate-200/70 shadow-xs flex items-center justify-between gap-4">
                                <p class="text-[10px] text-gray-500 font-bold uppercase tracking-tight">${isService ? 'Net Profit Margin' : window.t('potential_profit', 'Potential Gross Profit')}</p>
                                <p id="editCalcPotentialProfit" class="text-xs sm:text-sm font-black text-[#475B6E] whitespace-nowrap">TZS 0</p>
                            </div>
                        </div>
                    </div>

                    <!-- Supplier Details -->
                    <div class="${isService ? 'hidden' : ''}">
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
                <button type="submit" class="px-3.5 py-1.5 sm:px-6 sm:py-2.5 ${isService ? 'bg-purple-600 hover:bg-purple-700' : 'bg-[#475B6E] hover:bg-[#394a5a]'} text-white font-bold rounded-xl shadow-md transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 min-w-[110px] sm:min-w-[180px]">
                    <i data-lucide="check" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> ${isService ? 'Update Service' : window.t('save_changes', 'Save Changes')}
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
    const itemType = document.getElementById('editCiItemType')?.value || 'product';
    const isService = itemType === 'service';

    const qty = isService ? 1 : window.fmt.parseNumber(document.getElementById('editCiMainStoreStock')?.value || 0);
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

    const itemType = document.getElementById('editCiItemType')?.value || 'product';
    const isService = itemType === 'service';

    const costPrice = window.fmt.parseNumber(document.getElementById('editCiCostPrice').value || 0);
    const retailPrice = window.fmt.parseNumber(document.getElementById('editCiRetailPrice').value || 0);
    const wholesalePrice = isService ? retailPrice : window.fmt.parseNumber(document.getElementById('editCiWholesalePrice')?.value || 0);
    const mainStoreStock = (!isService && document.getElementById('editCiMainStoreStock')) ? window.fmt.parseNumber(document.getElementById('editCiMainStoreStock').value || 0) : 0;
    const minThreshold = (!isService && document.getElementById('editCiThreshold')) ? window.fmt.parseNumber(document.getElementById('editCiThreshold').value || 5) : 0;

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
        item_type: itemType,
        supplier_id: isService ? null : (document.getElementById('editCiSupplier')?.value || null),
        description: document.getElementById('editCiDescription')?.value || null
    };

    try {
        window.showLoader(isService ? 'Updating service catalog...' : 'Updating Central Inventory catalog...');
        if (payload.category && window.dbCategories && state.ownerId) {
            window.dbCategories.ensureCategory(state.ownerId, payload.category, itemType).catch(() => {});
        }
        await dbCentralInventory.update(itemId, payload);
        window.hideLoader();
        window.closeEditCentralItemModal();
        window.showToast(isService ? 'Service updated successfully!' : 'Stock item updated successfully in Central Inventory!', 'success');
        if (window.renderOwnerInventoryModule) window.renderOwnerInventoryModule();
    } catch (err) {
        window.hideLoader();
        window.showToast('Failed to update: ' + err.message, 'error');
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
        const centralItems = (await dbCentralInventory.fetchAll(state.ownerId)).filter(i => (i.item_type || 'product') === 'product' && !((i.category && String(i.category).toLowerCase().includes('service')) || (i.unit && String(i.unit).toLowerCase() === 'service')));

        if (!branches || branches.length === 0) {
            window.hideLoader();
            window.showToast('Please add at least one branch before dispatching stock.', 'warning');
            return;
        }

        const savedBranch = sessionStorage.getItem('bms_central_dispatch_branch');
        let rawBranchId = preselectBranchId;
        if (typeof rawBranchId === 'object' && rawBranchId !== null) {
            rawBranchId = rawBranchId.id || rawBranchId.branch_id || rawBranchId.branchId || null;
        }
        let selectedBranchId = (typeof rawBranchId === 'string' && rawBranchId && rawBranchId !== '[object Object]' && branches.some(b => b.id === rawBranchId))
            ? rawBranchId
            : (branches.some(b => b.id === savedBranch) ? savedBranch : branches[0]?.id);
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

                <!-- Dispatch Items — Unified Responsive Card Grid (Limited to 3 rows with internal scroll) -->
                <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden mb-16">
                    <div class="flex items-center justify-between p-3 sm:p-3.5 border-b table-header-accent">
                        <div class="flex items-center gap-2 text-xs font-bold text-white">
                            <i data-lucide="truck" class="w-4 h-4"></i>
                            <span>${window.t('dispatch_catalog', 'Dispatch Catalog & Stock Level')}</span>
                        </div>
                        <span class="text-[11px] font-medium text-gray-300">${window.t('batch_transfer', 'Batch Transfer')}</span>
                    </div>
                    <div id="dispatchCardsList" class="p-3 sm:p-4 max-h-[385px] overflow-y-auto scroller-custom pr-1">
                        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
                            ${centralItems.map(item => {
                                const mainStock = item.main_store_stock || 0;
                                const branchStock = branchMap[item.id] ?? branchMap[item.sku] ?? branchMap[item.name.toLowerCase().trim()] ?? 0;
                                const currentDispatchQty = dispatchState[item.id] || 0;
                                const isLow = branchStock <= (item.min_threshold || 5);
                                const retailPrice = Number(item.retail_price || item.price || 0);
                                const wholesalePrice = Number(item.wholesale_price || 0);
                                const safeName = (item.name || '').replace(/'/g, "\\'");

                                return `
                                <div class="dispatch-row bg-white dark:bg-gray-800 p-3 sm:p-3.5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-2xs space-y-2 flex flex-col justify-between hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                                     data-name="${(item.name || '').toLowerCase()}"
                                     data-sku="${(item.sku || '').toLowerCase()}"
                                     data-category="${(item.category || '').toLowerCase()}">
                                    
                                    <div class="flex items-start justify-between gap-2">
                                        <div class="min-w-0 flex-1">
                                            <h4 class="text-xs sm:text-sm font-black text-gray-900 dark:text-white leading-tight break-words">${item.name}</h4>
                                            <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                <span class="text-[9px] text-gray-400 font-mono">${item.sku || 'N/A'}</span>
                                                <span class="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">• ${item.category || 'General'}</span>
                                                ${item.unit ? `<span class="text-[9px] text-gray-400">(${item.unit})</span>` : ''}
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-1 shrink-0">
                                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${isLow ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'}">
                                                ${isLow ? 'Low Stock' : 'In Stock'}
                                            </span>
                                            <button onclick="window.openEditCentralItemModal('${item.id}')" class="p-1 text-gray-400 hover:text-amber-600 rounded-lg transition-colors cursor-pointer" title="Edit">
                                                <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div class="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-start justify-between text-xs gap-2">
                                        <div class="min-w-0">
                                            <span class="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 block leading-tight">Main HQ</span>
                                            <span class="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs sm:text-[13px]">${mainStock.toLocaleString()}</span>
                                        </div>
                                        <div class="text-center min-w-0">
                                            <span class="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 block leading-tight">Branch Stock</span>
                                            <span class="font-extrabold ${isLow ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'} text-xs sm:text-[13px]">${branchStock.toLocaleString()}</span>
                                        </div>
                                        <div class="text-right min-w-0">
                                            <span class="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 block leading-tight">Retail / Whole</span>
                                            <span class="font-extrabold text-gray-900 dark:text-white text-xs sm:text-[12px]">${retailPrice > 0 ? window.fmt.currency(retailPrice) : '—'}</span>
                                        </div>
                                    </div>

                                    <div class="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-2">
                                        <div class="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 p-0.5">
                                            <button onclick="window.adjustDispatchQty('${item.id}', -1, ${mainStock})" class="w-7 h-7 flex items-center justify-center bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-lg transition-colors cursor-pointer">
                                                <i data-lucide="minus" class="w-3 h-3"></i>
                                            </button>
                                            <input type="number" id="dispatch_input_${item.id}"
                                                   value="${currentDispatchQty}" min="0" max="${mainStock}"
                                                   onclick="if (this.value == '0') this.value = ''; this.select();"
                                                   onfocus="if (this.value == '0') this.value = ''; this.select();"
                                                   onblur="if (this.value.trim() === '' || isNaN(this.value)) { this.value = '0'; window.setDispatchQty('${item.id}', 0, ${mainStock}); }"
                                                   oninput="window.setDispatchQty('${item.id}', this.value, ${mainStock})"
                                                   class="dispatch-input-${item.id} w-12 text-center bg-transparent font-black text-xs sm:text-sm text-gray-900 dark:text-white outline-none">
                                            <button onclick="window.adjustDispatchQty('${item.id}', 1, ${mainStock})" class="w-7 h-7 flex items-center justify-center bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-lg transition-colors cursor-pointer">
                                                <i data-lucide="plus" class="w-3 h-3"></i>
                                            </button>
                                        </div>
                                        <div class="flex items-center gap-1.5">
                                            <button onclick="window.setDispatchQty('${item.id}', ${mainStock}, ${mainStock})" class="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 font-bold rounded-xl text-xs transition-colors cursor-pointer">
                                                Max
                                            </button>
                                            <button onclick="window.openDispatchModal('${item.id}', '${safeName}', ${mainStock})" class="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer">
                                                <i data-lucide="send" class="w-3 h-3"></i> Dispatch
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>


                <!-- Batch Dispatch Footer — fixed within main content area (offsetting desktop sidebar) and center-aligned -->
                <div class="fixed bottom-0 left-0 md:left-64 right-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 py-3 shadow-xl">
                    <div class="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-center gap-4 sm:gap-6">
                        <div class="flex items-center gap-2 shrink-0">
                            <div class="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <i data-lucide="package" class="w-4 h-4"></i>
                            </div>
                            <div class="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200">
                                <span class="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">Batch:</span>
                                <span id="dispatchItemCountSummary" class="text-emerald-700 dark:text-emerald-400 font-extrabold">0 items</span>
                                <span class="text-gray-300 dark:text-gray-600">·</span>
                                <span id="dispatchQtyTotalSummary" class="text-emerald-700 dark:text-emerald-400 font-extrabold">0 units</span>
                            </div>
                        </div>
                        <button onclick="window.executeBatchDispatch('${selectedBranchId}')" id="btnExecuteBatchDispatch"
                                class="h-9 px-5 flex items-center justify-center gap-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
                                style="color: #ffffff !important; background-color: #059669 !important;">
                            <i data-lucide="send" class="w-3.5 h-3.5 text-white shrink-0"></i>
                            <span id="btnExecuteBatchDispatchText" class="font-extrabold text-white tracking-wide">${window.t('dispatch', 'Dispatch')}</span>
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
            const btnEl = document.getElementById('btnExecuteBatchDispatch');
            const btnTextEl = document.getElementById('btnExecuteBatchDispatchText');

            if (countEl) countEl.textContent = `${activeItems} item${activeItems === 1 ? '' : 's'}`;
            if (qtyEl) qtyEl.textContent = `${totalQty.toLocaleString()} unit${totalQty === 1 ? '' : 's'}`;
            if (btnEl) {
                btnEl.disabled = totalQty <= 0;
            }
            if (btnTextEl) {
                btnTextEl.textContent = totalQty > 0 
                    ? `${window.t('dispatch', 'Dispatch')} (${totalQty.toLocaleString()})`
                    : window.t('dispatch', 'Dispatch');
            }
        };

        window.autoFillLowStockDispatch = async (branchId) => {
            const targetBranchInvRes = await dbInventory.fetchAll(branchId, { pageSize: 10000 });
            const targetItems = targetBranchInvRes.items || [];
            let filledCount = 0;

            centralItems.forEach(cItem => {
                if (cItem.item_type === 'service' || (cItem.category && String(cItem.category).toLowerCase().includes('service')) || (cItem.unit && String(cItem.unit).toLowerCase() === 'service')) {
                    return;
                }
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

// ===============================================================================
// BRANCH-ADDED INVENTORY ITEMS: OWNER REVIEW, CENTRAL REGISTRATION & ISOLATION
// ===============================================================================

window._branchItemsFilterState = {
    search: '',
    branchId: 'all',
    status: 'all' // 'all', 'pending', 'isolated'
};

window.updateBranchItemsBadgeCounter = async function() {
    try {
        const ownerId = window.state?.ownerId || (window.state?.profile && window.state.profile.id);
        if (!ownerId) return;
        const branches = await dbBranches.fetchAll(ownerId);
        if (!Array.isArray(branches) || branches.length === 0) return;
        const results = await Promise.all(
            branches.map(b => dbInventory.fetchAll(b.id, { pageSize: 1000 }).catch(() => ({ items: [] })))
        );
        let pendingCount = 0;
        results.forEach(res => {
            const items = Array.isArray(res) ? res : (res.items || []);
            items.forEach(it => {
                const isIsolated = it.is_isolated || it.isolation_status === 'isolated';
                const isRegistered = it.central_item_id || it.isolation_status === 'registered';
                if (!isIsolated && !isRegistered) {
                    pendingCount++;
                }
            });
        });
        const badge = document.getElementById('branchItemsBadgeCounter');
        if (badge) {
            badge.textContent = pendingCount;
            if (pendingCount > 0) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    } catch (e) {
        console.warn('[updateBranchItemsBadgeCounter]', e);
    }
};

window.renderBranchItemsView = async function(forceRefresh = false) {
    const container = document.getElementById('branchItemsViewContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="p-12 text-center text-gray-400 dark:text-gray-500">
            <i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-amber-500 mb-3"></i>
            <p class="text-sm font-bold">Scanning branch inventory submissions...</p>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    try {
        const ownerId = window.state?.ownerId || (window.state?.profile && window.state.profile.id);
        const branches = await dbBranches.fetchAll(ownerId);
        if (!Array.isArray(branches) || branches.length === 0) {
            container.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                    <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto mb-3">
                        <i data-lucide="git-branch" class="w-6 h-6"></i>
                    </div>
                    <h3 class="text-base font-black text-gray-900 dark:text-white">No Branches Registered</h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Add branches first to manage branch-specific inventory items.</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        const branchResults = await Promise.all(
            branches.map(b => dbInventory.fetchAll(b.id, { pageSize: 2000 }).catch(() => ({ items: [] })))
        );

        let branchItems = [];
        branchResults.forEach((res, idx) => {
            const b = branches[idx];
            const items = Array.isArray(res) ? res : (res.items || []);
            items.forEach(it => {
                const isIsolated = it.is_isolated || it.isolation_status === 'isolated';
                const hasCentralLink = !!it.central_item_id;
                if (!hasCentralLink || isIsolated || it.isolation_status === 'unregistered' || it.isolation_status === 'isolated') {
                    branchItems.push({
                        ...it,
                        branch_name: b.name,
                        branch_location: b.location || ''
                    });
                }
            });
        });

        window._branchSubmittedItems = branchItems;
        window._branchSubmittedBranches = branches;

        window.displayBranchItemsList(branchItems, branches);
    } catch (err) {
        console.error('[renderBranchItemsView] Error:', err);
        container.innerHTML = `
            <div class="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl p-6 text-center">
                <p class="text-sm font-black text-rose-700 dark:text-rose-300">Failed to load branch items: ${err.message}</p>
                <button onclick="window.renderBranchItemsView(true)" class="mt-3 px-4 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 cursor-pointer">
                    Try Again
                </button>
            </div>
        `;
    }
};

window.displayBranchItemsList = function(items, branches) {
    const container = document.getElementById('branchItemsViewContainer');
    if (!container) return;

    const totalItems = items.length;
    const pendingCount = items.filter(i => !i.is_isolated && i.isolation_status !== 'isolated').length;
    const isolatedCount = items.filter(i => i.is_isolated || i.isolation_status === 'isolated').length;
    const totalUnits = items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);

    // Update the badge counter in the tab switcher header
    const badge = document.getElementById('branchItemsBadgeCounter');
    if (badge) {
        badge.textContent = pendingCount;
        if (pendingCount > 0) badge.classList.remove('hidden');
        else badge.classList.add('hidden');
    }

    const branchOptionsHtml = `
        <option value="all">All Branches (${branches.length})</option>
        ${branches.map(b => `<option value="${b.id}">${b.name} (${b.location || 'Branch'})</option>`).join('')}
    `;

    container.innerHTML = `
        <!-- Bento Summary Statistics Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            <!-- 1. Total Submissions -->
            <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
                <div class="flex items-center justify-between mb-1.5 pr-10">
                    <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">Total Branch Items</span>
                </div>
                <div class="min-w-0 mt-auto pr-9">
                    <p class="text-dynamic-lg font-black text-gray-900 dark:text-white truncate leading-tight">${totalItems}</p>
                    <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">From all branches</p>
                </div>
                <div class="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 flex items-center justify-center absolute bottom-3 right-3 shrink-0">
                    <i data-lucide="layers" class="w-4 h-4"></i>
                </div>
            </div>

            <!-- 2. Pending Central Review -->
            <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 stat-card flex flex-col justify-between h-full min-w-0 shadow-xs">
                <div class="flex items-center justify-between mb-1.5 pr-10">
                    <span class="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tight truncate block">Pending Review</span>
                </div>
                <div class="min-w-0 mt-auto pr-9">
                    <p class="text-dynamic-lg font-black text-amber-600 dark:text-amber-400 truncate leading-tight">${pendingCount}</p>
                    <p class="text-[10px] text-amber-600/80 font-semibold mt-0.5 truncate">Require owner decision</p>
                </div>
                <div class="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center absolute bottom-3 right-3 shrink-0">
                    <i data-lucide="clock" class="w-4 h-4"></i>
                </div>
            </div>

            <!-- 3. Branch Exclusive (Isolated) -->
            <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-violet-200 dark:border-violet-800/60 stat-card flex flex-col justify-between h-full min-w-0 shadow-xs">
                <div class="flex items-center justify-between mb-1.5 pr-10">
                    <span class="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-tight truncate block">Branch Exclusive</span>
                </div>
                <div class="min-w-0 mt-auto pr-9">
                    <p class="text-dynamic-lg font-black text-violet-600 dark:text-violet-400 truncate leading-tight">${isolatedCount}</p>
                    <p class="text-[10px] text-violet-600/80 font-semibold mt-0.5 truncate">Isolated to branch</p>
                </div>
                <div class="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 flex items-center justify-center absolute bottom-3 right-3 shrink-0">
                    <i data-lucide="shield-check" class="w-4 h-4"></i>
                </div>
            </div>

            <!-- 4. Total Physical Units -->
            <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 stat-card flex flex-col justify-between h-full min-w-0 shadow-xs">
                <div class="flex items-center justify-between mb-1.5 pr-10">
                    <span class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tight truncate block">Physical Units</span>
                </div>
                <div class="min-w-0 mt-auto pr-9">
                    <p class="text-dynamic-lg font-black text-emerald-600 dark:text-emerald-400 truncate leading-tight">${totalUnits}</p>
                    <p class="text-[10px] text-emerald-600/80 font-semibold mt-0.5 truncate">Stored across branches</p>
                </div>
                <div class="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center absolute bottom-3 right-3 shrink-0">
                    <i data-lucide="boxes" class="w-4 h-4"></i>
                </div>
            </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 min-w-0">
                <!-- Search Input -->
                <div class="relative flex-1 min-w-[200px]">
                    <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"></i>
                    <input type="search" id="branchItemsSearchInput" placeholder="Search by name, SKU, branch, or category..."
                        value="${window._branchItemsFilterState.search || ''}"
                        oninput="window.filterBranchItemsList('search', this.value)"
                        class="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none">
                </div>

                <!-- Branch Filter -->
                <div class="w-full sm:w-52 shrink-0">
                    <select id="branchItemsBranchSelect" onchange="window.filterBranchItemsList('branchId', this.value)"
                        class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none">
                        ${branchOptionsHtml}
                    </select>
                </div>
            </div>

            <!-- Status Filter Pills (High-contrast solid active state) -->
            <div class="inline-flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner shrink-0 self-start md:self-auto">
                <button type="button" onclick="window.filterBranchItemsList('status', 'all')"
                    class="branch-item-filter-pill px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${window._branchItemsFilterState.status === 'all' ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}">
                    All (${totalItems})
                </button>
                <button type="button" onclick="window.filterBranchItemsList('status', 'pending')"
                    class="branch-item-filter-pill px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${window._branchItemsFilterState.status === 'pending' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}">
                    Pending (${pendingCount})
                </button>
                <button type="button" onclick="window.filterBranchItemsList('status', 'isolated')"
                    class="branch-item-filter-pill px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${window._branchItemsFilterState.status === 'isolated' ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}">
                    Isolated (${isolatedCount})
                </button>
            </div>
        </div>

        <!-- Branch Items Table / Cards Container -->
        <div id="branchItemsListContainer"></div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const bSelect = document.getElementById('branchItemsBranchSelect');
    if (bSelect && window._branchItemsFilterState.branchId) {
        bSelect.value = window._branchItemsFilterState.branchId;
    }

    window.renderBranchItemsTableAndCards(items, branches);
};

window.filterBranchItemsList = function(key, val) {
    if (key) window._branchItemsFilterState[key] = val;
    const items = window._branchSubmittedItems || [];
    const branches = window._branchSubmittedBranches || [];
    window.renderBranchItemsTableAndCards(items, branches);
};

window.renderBranchItemsTableAndCards = function(items, branches) {
    const listContainer = document.getElementById('branchItemsListContainer');
    if (!listContainer) return;

    const { search, branchId, status } = window._branchItemsFilterState;
    const query = (search || '').toLowerCase().trim();

    const filtered = (items || []).filter(item => {
        if (branchId && branchId !== 'all' && item.branch_id !== branchId) return false;

        const isIsolated = item.is_isolated || item.isolation_status === 'isolated';
        if (status === 'pending' && isIsolated) return false;
        if (status === 'isolated' && !isIsolated) return false;

        if (query) {
            const matchName = (item.name || '').toLowerCase().includes(query);
            const matchSku = (item.sku || '').toLowerCase().includes(query);
            const matchCat = (item.category || '').toLowerCase().includes(query);
            const matchBranch = (item.branch_name || '').toLowerCase().includes(query);
            if (!matchName && !matchSku && !matchCat && !matchBranch) return false;
        }

        return true;
    });

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-10 text-center">
                <div class="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-700/60 text-gray-400 flex items-center justify-center mx-auto mb-3">
                    <i data-lucide="package-search" class="w-6 h-6"></i>
                </div>
                <h4 class="text-sm font-black text-gray-900 dark:text-white">No Matching Branch Items</h4>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Try clearing your search query or changing filters.</p>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    const fmtCurrency = val => window.fmt?.currency ? window.fmt.currency(val) : `$${Number(val || 0).toFixed(2)}`;

    listContainer.innerHTML = `
        <!-- Desktop Table (sm and up) -->
        <div class="hidden sm:block w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div class="w-full overflow-x-auto">
                <table class="w-full text-left border-collapse table-auto">
                    <thead class="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <tr>
                            <th class="px-4 py-3.5">Product & SKU</th>
                            <th class="px-4 py-3.5">Origin Branch</th>
                            <th class="px-4 py-3.5">Category</th>
                            <th class="px-4 py-3.5 text-center">Branch Stock</th>
                            <th class="px-4 py-3.5 text-right">Retail / Cost</th>
                            <th class="px-4 py-3.5 text-center">Catalog Status</th>
                            <th class="px-4 py-3.5 text-right pr-4">Owner Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                        ${filtered.map(it => {
                            const isIsolated = it.is_isolated || it.isolation_status === 'isolated';
                            const retailPrice = it.retail_price ?? it.price ?? 0;
                            const costPrice = it.cost_price || 0;
                            const safeName = (it.name || '').replace(/'/g, "\\'");
                            const safeBranch = (it.branch_name || '').replace(/'/g, "\\'");

                            return `
                            <tr class="hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors">
                                <td class="px-4 py-3">
                                    <div class="flex items-center gap-2.5">
                                        <div class="w-8 h-8 rounded-xl ${isIsolated ? 'bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'} flex items-center justify-center shrink-0">
                                            <i data-lucide="${isIsolated ? 'shield-check' : 'package'}" class="w-4 h-4"></i>
                                        </div>
                                        <div class="min-w-0">
                                            <p class="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate">${it.name || 'Unnamed Item'}</p>
                                            <p class="text-[11px] text-gray-400 font-mono mt-0.5">${it.sku ? `SKU: ${it.sku}` : 'No SKU'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-4 py-3">
                                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
                                        <i data-lucide="map-pin" class="w-3 h-3"></i>
                                        <span>${it.branch_name}</span>
                                    </span>
                                </td>
                                <td class="px-4 py-3">
                                    <span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                        ${it.category || 'General'}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-center">
                                    <span class="text-xs sm:text-sm font-black ${Number(it.quantity) <= Number(it.min_threshold || 5) ? 'text-rose-600' : 'text-gray-900 dark:text-white'}">
                                        ${it.quantity || 0}
                                    </span>
                                    <span class="text-[10px] text-gray-400 block">${it.unit || 'units'}</span>
                                </td>
                                <td class="px-4 py-3 text-right">
                                    <p class="text-xs font-black text-emerald-600 dark:text-emerald-400">${fmtCurrency(retailPrice)}</p>
                                    <p class="text-[10px] text-gray-400 font-medium">Cost: ${fmtCurrency(costPrice)}</p>
                                </td>
                                <td class="px-4 py-3 text-center">
                                    ${isIsolated ? `
                                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                                        <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
                                        <span>Branch-Exclusive</span>
                                    </span>
                                    ` : `
                                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                        <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                                        <span>Pending Review</span>
                                    </span>
                                    `}
                                </td>
                                <td class="px-4 py-3 text-right pr-4">
                                    <div class="flex items-center justify-end gap-1.5">
                                        <button onclick="window.openRegisterBranchItemModal('${it.id}', '${it.branch_id}')"
                                            class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer whitespace-nowrap">
                                            <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                                            <span>Register to Central</span>
                                        </button>
                                        ${!isIsolated ? `
                                        <button onclick="window.toggleBranchItemIsolation('${it.id}', true, '${safeName}', '${safeBranch}')"
                                            class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900 border border-amber-200 dark:border-amber-800 transition-all cursor-pointer whitespace-nowrap"
                                            title="Keep this item exclusive only to ${it.branch_name}">
                                            <i data-lucide="shield-alert" class="w-3.5 h-3.5"></i>
                                            <span>Isolate to Branch</span>
                                        </button>
                                        ` : `
                                        <button onclick="window.toggleBranchItemIsolation('${it.id}', false, '${safeName}', '${safeBranch}')"
                                            class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-all cursor-pointer whitespace-nowrap"
                                            title="Remove isolation and mark pending">
                                            <i data-lucide="shield-x" class="w-3.5 h-3.5"></i>
                                            <span>Remove Isolation</span>
                                        </button>
                                        `}
                                    </div>
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Mobile Responsive Bento Cards (<sm) -->
        <div class="sm:hidden space-y-3">
            ${filtered.map(it => {
                const isIsolated = it.is_isolated || it.isolation_status === 'isolated';
                const retailPrice = it.retail_price ?? it.price ?? 0;
                const costPrice = it.cost_price || 0;
                const safeName = (it.name || '').replace(/'/g, "\\'");
                const safeBranch = (it.branch_name || '').replace(/'/g, "\\'");

                return `
                <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-xs space-y-3">
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
                                    <i data-lucide="map-pin" class="w-2.5 h-2.5"></i>
                                    <span>${it.branch_name}</span>
                                </span>
                                <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                    ${it.category || 'General'}
                                </span>
                            </div>
                            <h4 class="text-sm font-black text-gray-900 dark:text-white leading-tight truncate">${it.name}</h4>
                            <p class="text-[11px] text-gray-400 font-mono mt-0.5">${it.sku ? `SKU: ${it.sku}` : 'No SKU'}</p>
                        </div>
                        <div>
                            ${isIsolated ? `
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-violet-100 text-violet-700 dark:bg-violet-950/80 dark:text-violet-300">
                                <i data-lucide="shield-check" class="w-3 h-3"></i>
                                <span>Isolated</span>
                            </span>
                            ` : `
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
                                <i data-lucide="clock" class="w-3 h-3"></i>
                                <span>Pending</span>
                            </span>
                            `}
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-gray-900/60 p-2.5 rounded-xl text-xs">
                        <div>
                            <span class="text-[10px] text-gray-400 font-bold uppercase block">Stock in Branch</span>
                            <span class="text-sm font-black ${Number(it.quantity) <= Number(it.min_threshold || 5) ? 'text-rose-600' : 'text-gray-900 dark:text-white'}">
                                ${it.quantity || 0} <span class="text-[10px] font-normal text-gray-400">${it.unit || 'units'}</span>
                            </span>
                        </div>
                        <div class="text-right">
                            <span class="text-[10px] text-gray-400 font-bold uppercase block">Retail Price</span>
                            <span class="text-sm font-black text-emerald-600 dark:text-emerald-400">${fmtCurrency(retailPrice)}</span>
                            <span class="text-[10px] text-gray-400 block">Cost: ${fmtCurrency(costPrice)}</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2 pt-1">
                        <button onclick="window.openRegisterBranchItemModal('${it.id}', '${it.branch_id}')"
                            class="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs active:scale-[0.98] transition-all cursor-pointer">
                            <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                            <span>Register to HQ</span>
                        </button>
                        ${!isIsolated ? `
                        <button onclick="window.toggleBranchItemIsolation('${it.id}', true, '${safeName}', '${safeBranch}')"
                            class="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 active:scale-[0.98] transition-all cursor-pointer">
                            <i data-lucide="shield-alert" class="w-3.5 h-3.5"></i>
                            <span>Keep Isolated</span>
                        </button>
                        ` : `
                        <button onclick="window.toggleBranchItemIsolation('${it.id}', false, '${safeName}', '${safeBranch}')"
                            class="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 active:scale-[0.98] transition-all cursor-pointer">
                            <i data-lucide="shield-x" class="w-3.5 h-3.5"></i>
                            <span>Un-isolate</span>
                        </button>
                        `}
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
};

window.openRegisterBranchItemModal = async function(itemId, branchId) {
    const item = (window._branchSubmittedItems || []).find(i => String(i.id) === String(itemId)) || await dbInventory.fetchOne(itemId);
    if (!item) {
        showToast('Item not found', 'error');
        return;
    }

    const branches = window._branchSubmittedBranches || await dbBranches.fetchAll(window.state?.ownerId);
    const otherBranchesCount = (branches || []).filter(b => b.id !== item.branch_id).length;

    const modalId = 'registerBranchItemModal';
    document.getElementById(modalId)?.remove();

    const cleanStr = s => (s || '').replace(/"/g, '&quot;');

    const overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 backdrop-blur-xs transition-opacity duration-200';
    
    overlay.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
            <!-- Modal Header -->
            <div class="p-4 sm:p-5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-200 dark:shadow-none">
                        <i data-lucide="plus-circle" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="text-base font-black text-gray-900 dark:text-white leading-tight">Register to Central Catalog</h3>
                        <p class="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">Origin: ${cleanStr(item.branch_name || 'Branch')} &bull; ${cleanStr(item.name)}</p>
                    </div>
                </div>
                <button type="button" onclick="document.getElementById('${modalId}').remove()" class="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <!-- Modal Form Body -->
            <form id="registerBranchItemForm" class="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                <div>
                    <label class="block text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">Product Name *</label>
                    <input type="text" id="regItemName" required value="${cleanStr(item.name)}" class="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">SKU / Barcode</label>
                        <input type="text" id="regItemSku" value="${cleanStr(item.sku || '')}" class="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">Category</label>
                        <input type="text" id="regItemCategory" value="${cleanStr(item.category || 'General')}" class="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-2.5">
                    <div>
                        <label class="block text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">Cost Price</label>
                        <input type="number" id="regItemCost" min="0" step="any" value="${item.cost_price || 0}" class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">Retail Price *</label>
                        <input type="number" id="regItemRetail" required min="0" step="any" value="${item.retail_price ?? item.price ?? 0}" class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">Wholesale</label>
                        <input type="number" id="regItemWholesale" min="0" step="any" value="${item.wholesale_price ?? item.price ?? 0}" class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">HQ Main Store Stock</label>
                        <input type="number" id="regItemHqStock" min="0" step="1" value="0" class="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0 units at HQ">
                        <p class="text-[10px] text-gray-400 mt-0.5">Stock at central warehouse</p>
                    </div>
                    <div>
                        <label class="block text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">Min Threshold</label>
                        <input type="number" id="regItemThreshold" min="0" step="1" value="${item.min_threshold || 5}" class="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                    </div>
                </div>

                <!-- Rollout Option -->
                <div class="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                    <label class="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" id="regItemRollout" checked class="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300">
                        <div class="text-xs">
                            <span class="font-black text-indigo-950 dark:text-indigo-200 block">Roll out product to other branches (${otherBranchesCount} branches)</span>
                            <span class="text-indigo-700 dark:text-indigo-400 mt-0.5 block font-medium">Initializes product in all other branches with 0 stock so they can request or sell it.</span>
                        </div>
                    </label>
                </div>
            </form>

            <!-- Modal Footer -->
            <div class="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-2.5 shrink-0">
                <button type="button" onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl text-xs border border-gray-200 dark:border-gray-600 cursor-pointer">
                    Cancel
                </button>
                <button type="button" id="btnConfirmCentralReg" onclick="window.submitRegisterBranchItem('${item.id}', '${item.branch_id}')" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-1.5 cursor-pointer">
                    <i data-lucide="check" class="w-4 h-4"></i>
                    <span>Register to Central</span>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();
};

window.submitRegisterBranchItem = async function(itemId, branchId) {
    const btn = document.getElementById('btnConfirmCentralReg');
    const name = document.getElementById('regItemName')?.value?.trim();
    if (!name) {
        showToast('Please enter a product name', 'warning');
        return;
    }

    const sku = document.getElementById('regItemSku')?.value?.trim() || null;
    const category = document.getElementById('regItemCategory')?.value?.trim() || 'General';
    const cost_price = Number(document.getElementById('regItemCost')?.value) || 0;
    const retail_price = Number(document.getElementById('regItemRetail')?.value) || 0;
    const wholesale_price = Number(document.getElementById('regItemWholesale')?.value) || retail_price;
    const hq_stock = Number(document.getElementById('regItemHqStock')?.value) || 0;
    const min_threshold = Number(document.getElementById('regItemThreshold')?.value) || 5;
    const rollout = document.getElementById('regItemRollout')?.checked ?? true;

    const ownerId = window.state?.ownerId || (window.state?.profile && window.state.profile.id);
    const branches = window._branchSubmittedBranches || await dbBranches.fetchAll(ownerId);
    const ownerBranchIds = (branches || []).map(b => b.id);

    const centralPayload = {
        name,
        sku,
        category,
        cost_price,
        retail_price,
        wholesale_price,
        price: retail_price,
        main_store_stock: hq_stock,
        min_threshold,
        item_type: 'product',
        owner_id: ownerId,
        originating_branch_id: branchId
    };

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Registering...`;
            if (window.lucide) window.lucide.createIcons();
        }

        await dbInventory.registerToCentral(itemId, centralPayload, {
            distributeToBranches: rollout,
            ownerBranchIds
        });

        showToast(`"${name}" registered to Central Catalog successfully!`, 'success');
        document.getElementById('registerBranchItemModal')?.remove();
        if (window.renderBranchItemsView) window.renderBranchItemsView(true);
        if (window.updateBranchItemsBadgeCounter) window.updateBranchItemsBadgeCounter();
    } catch (err) {
        showToast('Registration failed: ' + err.message, 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Register to Central`;
            if (window.lucide) window.lucide.createIcons();
        }
    }
};

window.toggleBranchItemIsolation = async function(itemId, shouldIsolate, itemName = 'Item', branchName = 'Branch') {
    if (shouldIsolate) {
        const confirmed = await window.confirmModal(
            'Isolate Stock to Branch?',
            `"${itemName}" will remain strictly exclusive to ${branchName}. It will not appear in the Central Headquarters catalog and cannot be dispatched to other branches.`,
            'Yes, Keep Isolated',
            'Cancel'
        );
        if (!confirmed) return;
    }

    window.showLoader(shouldIsolate ? 'Isolating item to branch...' : 'Removing branch isolation...');
    try {
        await dbInventory.setIsolated(itemId, shouldIsolate);
        window.hideLoader();
        showToast(
            shouldIsolate 
                ? `"${itemName}" is now exclusive to ${branchName}.` 
                : `"${itemName}" isolation removed. Returned to pending review.`,
            'success'
        );
        if (window.renderBranchItemsView) window.renderBranchItemsView(true);
        if (window.updateBranchItemsBadgeCounter) window.updateBranchItemsBadgeCounter();
    } catch (err) {
        window.hideLoader();
        showToast('Failed to update isolation: ' + err.message, 'error');
    }
};
