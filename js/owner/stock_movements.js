import { dbStockMovements, dbCentralInventory, dbBranches } from '../db.js';

export async function renderStockMovementsModule() {
    const container = document.getElementById('mainContent');
    if (!container) return;

    let shell = document.getElementById('stockMovementsShell');
    if (!shell) {
        container.innerHTML = `
        <div class="space-y-6 slide-in" id="stockMovementsShell">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center shrink-0">
                        <i data-lucide="history" class="w-6 h-6 text-indigo-600 dark:text-indigo-400"></i>
                    </div>
                    <div>
                        <h2 class="text-lg font-black text-gray-900 dark:text-white">${window.t('audit_ledger_title', 'Stock Audit Ledger & Reconciliation')}</h2>
                        <p class="text-xs text-gray-500 dark:text-gray-400 font-medium">${window.t('audit_ledger_sub', 'Traceable movement history, expected returns, and stock reconciliation')}</p>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl border border-gray-200 dark:border-gray-700" id="stockMovementsTabControls">
                    <button onclick="window.setStockMovementTab('ledger')" class="px-4 py-2 rounded-xl text-xs font-bold transition-all bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm flex items-center gap-1.5">
                        <i data-lucide="list" class="w-3.5 h-3.5"></i> ${window.t('movement_ledger', 'Movement Ledger')}
                    </button>
                    <button onclick="window.setStockMovementTab('reconciliation')" class="px-4 py-2 rounded-xl text-xs font-bold transition-all text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <i data-lucide="check-square" class="w-3.5 h-3.5"></i> ${window.t('reconciliation', 'Reconciliation')}
                    </button>
                </div>
            </div>

            <!-- Summary KPI Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4" id="smStatsGrid">
                ${[1, 2, 3, 4].map(() => `<div class="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 animate-pulse h-16"></div>`).join('')}
            </div>

            <!-- Main Content Container -->
            <div id="stockMovementsMainView">
                <div class="py-12 text-center text-gray-400 text-sm">Loading stock ledger & audit trail...</div>
            </div>
        </div>`;
        if (window.lucide) window.lucide.createIcons();
    }

    try {
        const ownerId = state.ownerId;
        const branches = await dbBranches.fetchAll(ownerId);
        const centralItems = await dbCentralInventory.fetchAll(ownerId);
        const movements = await dbStockMovements.fetchAll(ownerId, { limit: 300 });

        window._cachedStockMovements = movements;
        window._cachedCentralItems = centralItems;
        window._cachedBranches = branches;

        let activeTab = window.state._stockMovementTab || 'ledger';
        let branchFilter = window.state._stockMovementBranch || 'all';
        let typeFilter = window.state._stockMovementType || 'all';
        let searchFilter = window.state._stockMovementSearch || '';

        const branchOptions = branches.map(b => ({ value: b.id, label: b.name, icon: 'store' }));
        branchOptions.unshift({ value: 'all', label: 'All Locations / Branches', icon: 'layers' });

        const typeOptions = [
            { value: 'all', label: 'All Movement Types', icon: 'filter' },
            { value: 'purchase', label: 'Purchase (Main Store)', icon: 'shopping-bag' },
            { value: 'dispatch', label: 'Dispatch (Main -> Branch)', icon: 'truck' },
            { value: 'return_to_main', label: 'Return (Branch -> Main)', icon: 'corner-up-left' },
            { value: 'sale', label: 'Branch Sale', icon: 'shopping-cart' },
            { value: 'transfer', label: 'Branch Transfer', icon: 'arrow-right-left' },
            { value: 'adjustment', label: 'Stock Adjustment', icon: 'sliders' },
            { value: 'return', label: 'Stock Return', icon: 'rotate-ccw' }
        ];

        const totalPurchasedQty = movements.filter(m => m.movement_type === 'purchase').reduce((s, m) => s + (m.quantity || 0), 0);
        const totalDispatchedQty = movements.filter(m => m.movement_type === 'dispatch').reduce((s, m) => s + (m.quantity || 0), 0);
        const totalSoldQty = movements.filter(m => m.movement_type === 'sale').reduce((s, m) => s + (m.quantity || 0), 0);
        const totalSalesRevenue = movements.filter(m => m.movement_type === 'sale').reduce((s, m) => s + (m.total_selling || 0), 0);

        const statsGrid = document.getElementById('smStatsGrid');
        if (statsGrid) {
            statsGrid.innerHTML = `
                <div class="bg-white dark:bg-gray-800 px-4 py-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <p class="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('total_purchased', 'Total Purchased Qty')}</p>
                    <p class="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 leading-tight">${totalPurchasedQty.toLocaleString()} <span class="text-xs text-gray-400 font-normal">units</span></p>
                </div>
                <div class="bg-white dark:bg-gray-800 px-4 py-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <p class="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('total_dispatched', 'Total Dispatched Qty')}</p>
                    <p class="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 leading-tight">${totalDispatchedQty.toLocaleString()} <span class="text-xs text-gray-400 font-normal">units</span></p>
                </div>
                <div class="bg-white dark:bg-gray-800 px-4 py-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <p class="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('total_sold', 'Total Sold Qty')}</p>
                    <p class="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 leading-tight">${totalSoldQty.toLocaleString()} <span class="text-xs text-gray-400 font-normal">units</span></p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 px-4 py-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 shadow-2xs z-10">${window.fmt ? window.fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('sales_revenue', 'Recorded Sales Revenue')}</p>
                    <p class="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 leading-tight" title="${window.fmt.currency(totalSalesRevenue)}">${window.fmt.number(totalSalesRevenue)}</p>
                </div>`;
        }

        const mainView = document.getElementById('stockMovementsMainView');
        if (mainView) {
            if (activeTab === 'ledger') {
                mainView.innerHTML = renderMovementLedgerTable(branchOptions, typeOptions, branchFilter, typeFilter, searchFilter);
                window.filterStockMovementsTable();
            } else {
                mainView.innerHTML = renderReconciliationView(centralItems, branches);
            }
        }

        if (window.lucide) window.lucide.createIcons();

        const branchInput = document.getElementById('smBranchFilter');
        if (branchInput) {
            branchInput.addEventListener('change', (e) => {
                window.filterStockMovementsTable(e.target.value, null, null);
            });
        }
        const typeInput = document.getElementById('smTypeFilter');
        if (typeInput) {
            typeInput.addEventListener('change', (e) => {
                window.filterStockMovementsTable(null, e.target.value, null);
            });
        }

    } catch (err) {
        console.error('[StockMovements] Error rendering module:', err);
        const mainView = document.getElementById('stockMovementsMainView');
        if (mainView) mainView.innerHTML = `<div class="py-12 text-center text-red-500">Failed loading audit ledger: ${err.message}</div>`;
    }
}

function renderMovementLedgerTable(branchOptions, typeOptions, branchFilter, typeFilter, searchFilter) {
    return `
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div class="flex flex-wrap items-center gap-3 p-3.5 sm:p-4 border-b border-gray-100 dark:border-gray-700">
            <div class="flex-1 relative min-w-[200px]">
                <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"></i>
                <input type="search" id="smSearchInput" autocomplete="off" placeholder="${window.t('search', 'Search')}..." value="${searchFilter}"
                    class="w-full pl-11 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                    style="padding-left: 2.85rem !important;"
                    oninput="window.filterStockMovementsTable(null, null, this.value)"
                    onsearch="window.filterStockMovementsTable(null, null, this.value)"
                    onchange="window.filterStockMovementsTable(null, null, this.value)"
                    onkeyup="window.filterStockMovementsTable(null, null, this.value)">
            </div>
            ${window.renderPremiumSelect({
                id: 'smBranchFilter',
                selectedValue: branchFilter,
                searchable: false,
                classes: 'w-full sm:w-56 text-sm',
                options: branchOptions
            })}
            ${window.renderPremiumSelect({
                id: 'smTypeFilter',
                selectedValue: typeFilter,
                searchable: false,
                classes: 'w-full sm:w-52 text-sm',
                options: typeOptions
            })}
        </div>

        <!-- Unified Responsive Stock Movements Card Grid Container (Limited to 3 rows with internal scroll) -->
        <div class="flex items-center justify-between p-3 sm:p-3.5 border-b table-header-accent">
            <div class="flex items-center gap-2 text-xs font-bold text-white">
                <i data-lucide="arrow-left-right" class="w-4 h-4"></i>
                <span>${window.t('stock_movements_ledger', 'Stock Movement Ledger')}</span>
            </div>
            <span class="text-[11px] font-medium text-gray-300">Audit Trail</span>
        </div>
        <div id="stockMovementsContainer" class="p-3 sm:p-4 max-h-[385px] overflow-y-auto scroller-custom pr-1">
            <div class="py-12 text-center text-gray-400 text-sm animate-pulse">Loading movements...</div>
        </div>
    </div>`;
}

window.filterStockMovementsTable = function(branchVal, typeVal, searchVal) {
    const searchInput = document.getElementById('smSearchInput');
    const domSearchVal = searchInput ? searchInput.value : '';

    if (branchVal !== undefined && branchVal !== null) window.state._stockMovementBranch = branchVal;
    if (typeVal !== undefined && typeVal !== null) window.state._stockMovementType = typeVal;
    if (typeof searchVal === 'string') {
        window.state._stockMovementSearch = searchVal;
        if (searchInput && searchInput.value !== searchVal) searchInput.value = searchVal;
    } else if (searchInput) {
        window.state._stockMovementSearch = domSearchVal;
    }

    const movements = window._cachedStockMovements || [];
    let branchFilter = window.state._stockMovementBranch || 'all';
    let typeFilter = window.state._stockMovementType || 'all';
    let rawSearch = (window.state._stockMovementSearch !== undefined && window.state._stockMovementSearch !== null) ? window.state._stockMovementSearch : domSearchVal;
    let searchFilter = (rawSearch || '').trim().toLowerCase();

    let filtered = [...movements];
    if (branchFilter !== 'all') {
        filtered = filtered.filter(m => m.branch_id === branchFilter);
    }
    if (typeFilter !== 'all') {
        filtered = filtered.filter(m => m.movement_type === typeFilter);
    }
    if (searchFilter) {
        filtered = filtered.filter(m => 
            (m.item_name && m.item_name.toLowerCase().includes(searchFilter)) ||
            (m.reference_no && m.reference_no.toLowerCase().includes(searchFilter)) ||
            (m.notes && m.notes.toLowerCase().includes(searchFilter))
        );
    }

    window.currentMovements = filtered;

    const container = document.getElementById('stockMovementsContainer');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="py-12 text-center text-gray-400 text-sm">
                <i data-lucide="package-open" class="w-8 h-8 mx-auto mb-2 text-gray-300"></i>
                No stock movements found matching filter
            </div>`;
        if (window.lucide) window.lucide.createIcons({ scope: container });
        return;
    }

    container.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
            ${filtered.map(m => {
                const dateStr = new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                const typeBadge = getTypeBadge(m.movement_type);
                const location = m.branches?.name || (m.movement_type === 'purchase' ? 'Main Store (Central)' : 'Central Store');

                return `
                <div class="bg-white dark:bg-gray-800 p-3 sm:p-3.5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-2xs space-y-2 flex flex-col justify-between hover:border-gray-300 dark:hover:border-gray-600 transition-all">
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0 flex-1">
                            <h4 class="text-xs sm:text-sm font-black text-gray-900 dark:text-white leading-tight break-words">${m.item_name}</h4>
                            <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span class="text-[9px] text-gray-400 font-mono">${dateStr}</span>
                                <span class="text-[9px] font-bold text-gray-500 dark:text-gray-400">• ${location}</span>
                            </div>
                        </div>
                        <div class="shrink-0">
                            ${typeBadge}
                        </div>
                    </div>

                    <div class="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-start justify-between text-xs gap-2">
                        <div class="min-w-0">
                            <span class="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 block leading-tight">Quantity</span>
                            <span class="font-extrabold text-gray-900 dark:text-white text-xs sm:text-[13px]">${m.quantity} units</span>
                        </div>
                        <div class="text-center min-w-0">
                            <span class="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 block leading-tight">Cost / Selling</span>
                            <div class="flex items-center justify-center gap-1 flex-wrap mt-0.5">
                                <span class="font-extrabold text-gray-600 dark:text-gray-300 text-xs sm:text-[12px]">${window.fmt.currency(m.total_cost || 0)}</span>
                                <span class="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs sm:text-[12px]">/ ${window.fmt.currency(m.total_selling || 0)}</span>
                            </div>
                        </div>
                        <div class="text-right min-w-0">
                            <span class="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 block leading-tight">Notes</span>
                            <span class="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate block max-w-[110px]" title="${m.notes || ''}">${m.notes || '—'}</span>
                        </div>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    `;

    if (window.lucide) window.lucide.createIcons({ scope: container });
};

function getTypeBadge(type) {
    switch (type) {
        case 'purchase':
            return `<span class="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider rounded-lg border border-indigo-200 dark:border-indigo-800">Purchase</span>`;
        case 'dispatch':
            return `<span class="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider rounded-lg border border-amber-200 dark:border-amber-800">Dispatch</span>`;
        case 'return_to_main':
        case 'return':
            return `<span class="px-2.5 py-1 bg-cyan-50 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 text-[10px] font-black uppercase tracking-wider rounded-lg border border-cyan-200 dark:border-cyan-800">Return to Main</span>`;
        case 'sale':
            return `<span class="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider rounded-lg border border-emerald-200 dark:border-emerald-800">Sale</span>`;
        case 'transfer':
            return `<span class="px-2.5 py-1 bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-black uppercase tracking-wider rounded-lg border border-purple-200 dark:border-purple-800">Transfer</span>`;
        case 'adjustment':
            return `<span class="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider rounded-lg border border-blue-200 dark:border-blue-800">Adjustment</span>`;
        default:
            return `<span class="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px] font-black uppercase tracking-wider rounded-lg">${type}</span>`;
    }
}

function renderStockReconciliationView(centralItems, branches, movements) {
    window.currentReconciliationItems = centralItems;
    window.currentReconciliationMovements = movements;
    window.currentReconciliationBranches = branches;
    return `
    <div class="space-y-6">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 class="text-base font-black text-gray-900 dark:text-white mb-1">Expected Return on Distributed Stock</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-6">Track distributed quantities, actual sales generated, remaining expected revenue, and gross profit by product catalog across all branches.</p>

            <!-- Mobile Reconciliation Button -->
            <div class="sm:hidden mb-4">
                <button onclick="window.showStockReconciliationModal()" class="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl text-xs border border-indigo-100/50 dark:border-indigo-950/50 shadow-xs transition-all">
                    <i data-lucide="bar-chart-2" class="w-4 h-4"></i> ${window.t('click_see_reconciliation', 'Click to See Reconciliation Details')}
                </button>
            </div>

            <div class="overflow-x-auto hidden sm:block">
                <table class="w-full text-sm">
                    <thead class="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                        <tr>
                            <th class="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Product Catalog</th>
                            <th class="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Main Store Qty</th>
                            <th class="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Dispatched Qty</th>
                            <th class="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Sold Qty</th>
                            <th class="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Branch Stock</th>
                            <th class="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Actual Sales</th>
                            <th class="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Remaining Exp. Sales</th>
                            <th class="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Gross Profit Earned</th>
                            <th class="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Reconciliation</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
                        ${centralItems.length === 0 ? `<tr><td colspan="9" class="py-12 text-center text-gray-400 text-sm">No items found</td></tr>` :
                        centralItems.map(item => {
                            const costPrice = Number(item.cost_price || 0);
                            const sellingPrice = Number(item.price || 0);

                            // Calculate dispatches, returns & sales for this central item
                            const itemDispatches = movements.filter(m => m.central_item_id === item.id && m.movement_type === 'dispatch');
                            const itemReturns = movements.filter(m => m.central_item_id === item.id && (m.movement_type === 'return_to_main' || m.movement_type === 'return'));
                            const itemSales = movements.filter(m => m.central_item_id === item.id && m.movement_type === 'sale');

                            const totalDispatched = itemDispatches.reduce((s, m) => s + (m.quantity || 0), 0);
                            const totalReturned = itemReturns.reduce((s, m) => s + (m.quantity || 0), 0);
                            const netDispatched = Math.max(0, totalDispatched - totalReturned);
                            const totalSold = itemSales.reduce((s, m) => s + (m.quantity || 0), 0);

                            const branchStockQty = item.inventory ? item.inventory.reduce((s, inv) => s + (inv.quantity || 0), 0) : 0;

                            const actualSalesAmount = totalSold * sellingPrice;
                            const remainingExpectedSales = branchStockQty * sellingPrice;
                            const grossProfitEarned = totalSold * (sellingPrice - costPrice);

                            // Reconciliation Check: Net Dispatched = Sold + Current Branch Stock
                            const isReconciled = netDispatched === (totalSold + branchStockQty);

                            return `
                            <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                                <td class="px-4 py-3.5">
                                    <p class="font-bold text-gray-900 dark:text-white">${item.name}</p>
                                    <p class="text-[11px] text-gray-400">Cost: ${window.fmt.currency(costPrice)} | Price: ${window.fmt.currency(sellingPrice)}</p>
                                </td>
                                <td class="px-4 py-3.5 text-right font-black text-indigo-600 dark:text-indigo-400">${item.main_store_stock || 0}</td>
                                <td class="px-4 py-3.5 text-right font-bold text-amber-600 dark:text-amber-400">${totalDispatched}</td>
                                <td class="px-4 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">${totalSold}</td>
                                <td class="px-4 py-3.5 text-right font-bold text-gray-900 dark:text-white">${branchStockQty}</td>
                                <td class="px-4 py-3.5 text-right text-xs font-bold text-emerald-600 dark:text-emerald-400">${window.fmt.currency(actualSalesAmount)}</td>
                                <td class="px-4 py-3.5 text-right text-xs font-bold text-indigo-600 dark:text-indigo-400">${window.fmt.currency(remainingExpectedSales)}</td>
                                <td class="px-4 py-3.5 text-right text-xs font-bold text-purple-600 dark:text-purple-400">${window.fmt.currency(grossProfitEarned)}</td>
                                <td class="px-4 py-3.5 text-right">
                                    ${isReconciled ? `
                                        <span class="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                            <i data-lucide="check-circle" class="w-3 h-3"></i> Balanced
                                        </span>
                                    ` : `
                                        <span class="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                                            <i data-lucide="alert-triangle" class="w-3 h-3"></i> Adjustment
                                        </span>
                                    `}
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `;
}

window.setStockMovementTab = function(tab) {
    window.state._stockMovementTab = tab;
    renderStockMovementsModule();
};

window.showStockMovementsModal = function() {
    if (!window.currentMovements) return;

    let movementsHtml = window.currentMovements.map(m => {
        const dateStr = new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const location = m.branches?.name || (m.movement_type === 'purchase' ? 'Main Store (Central)' : 'Central Store');
        const typeText = m.movement_type.charAt(0).toUpperCase() + m.movement_type.slice(1);

        return `
        <div class="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-150 dark:border-gray-700/60 space-y-2">
            <div class="flex justify-between items-center border-b border-gray-200/50 dark:border-gray-750 pb-1.5 mb-2">
                <span class="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs">${m.item_name}</span>
                <span class="text-[10px] text-gray-400 font-mono">${dateStr}</span>
            </div>
            <div class="space-y-1.5 text-[11px]">
                <div class="flex justify-between items-center">
                    <span class="text-gray-500 font-semibold uppercase tracking-wider text-[8px]">${window.t('movement_type', 'Type')}</span>
                    <span class="font-bold">${typeText}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-500 font-semibold uppercase tracking-wider text-[8px]">${window.t('location_branch', 'Location / Branch')}</span>
                    <span class="font-bold text-gray-700 dark:text-gray-300">${location}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-500 font-semibold uppercase tracking-wider text-[8px]">Qty</span>
                    <span class="font-black text-gray-900 dark:text-white">${m.quantity}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-500 font-semibold uppercase tracking-wider text-[8px]">${window.t('cost_value', 'Cost Value')}</span>
                    <span class="font-bold text-amber-600 dark:text-amber-400">${window.fmt.currency(m.total_cost || 0)}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-500 font-semibold uppercase tracking-wider text-[8px]">${window.t('selling_value', 'Selling Value')}</span>
                    <span class="font-bold text-emerald-600 dark:text-emerald-400">${window.fmt.currency(m.total_selling || 0)}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-500 font-semibold uppercase tracking-wider text-[8px]">${window.t('notes_ref', 'Notes / Reference')}</span>
                    <span class="text-gray-600 dark:text-gray-400 max-w-[150px] truncate text-right">${m.notes || m.reference_no || '—'}</span>
                </div>
            </div>
        </div>`;
    }).join('');

    if (window.currentMovements.length === 0) {
        movementsHtml = `<div class="py-12 text-center text-gray-400 text-sm">No stock movements found</div>`;
    }

    const modalHtml = `
        <div class="p-4 flex flex-col overflow-hidden">
            <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2.5 mb-3">
                <h3 class="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <i data-lucide="history" class="w-4 h-4 text-indigo-500"></i> ${window.t('click_see_stock_movements', 'Stock Movements')}
                </h3>
                <button onclick="window.closeStockMovementsModal()" class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto space-y-2.5 pr-0.5 scrollbar-custom">
                ${movementsHtml}
            </div>
            <div class="border-t border-gray-150 dark:border-gray-800 pt-3 mt-3 flex justify-end">
                <button onclick="window.closeStockMovementsModal()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-all shadow-sm">
                    ${window.t('close', 'Close')}
                </button>
            </div>
        </div>
    `;

    openModal(modalHtml);
};

window.closeStockMovementsModal = function() {
    closeModal();
};

function renderReconciliationView(centralItems, branches) {
    const movements = window._cachedStockMovements || [];
    window.currentReconciliationItems = centralItems;
    window.currentReconciliationMovements = movements;

    return `
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div class="p-3.5 sm:p-4 border-b flex justify-between items-center table-header-accent">
            <div>
                <h3 class="text-sm font-bold text-white">${window.t('reconciliation_table', 'Central vs Branch Stock Reconciliation')}</h3>
                <p class="text-xs text-gray-300">Balance check of main store dispatches vs branch sales and current stock levels</p>
            </div>
            <button onclick="window.showStockReconciliationModal()" class="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all">
                <i data-lucide="maximize-2" class="w-3.5 h-3.5"></i> ${window.t('view_breakdown', 'Detailed Breakdown')}
            </button>
        </div>
        <div class="p-3 sm:p-4 max-h-[385px] overflow-y-auto scroller-custom pr-1">
            ${centralItems.length === 0 ? `
                <div class="py-12 text-center text-gray-400 text-sm">
                    <i data-lucide="package-open" class="w-8 h-8 mx-auto mb-2 text-gray-300"></i>
                    No items found for reconciliation
                </div>` : `
                <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
                    ${centralItems.map(item => {
                        const itemDispatches = movements.filter(m => m.central_item_id === item.id && m.movement_type === 'dispatch');
                        const itemReturns = movements.filter(m => m.central_item_id === item.id && (m.movement_type === 'return_to_main' || m.movement_type === 'return'));
                        const itemSales = movements.filter(m => m.central_item_id === item.id && m.movement_type === 'sale');
                        const totalDispatched = itemDispatches.reduce((s, m) => s + (m.quantity || 0), 0);
                        const totalReturned = itemReturns.reduce((s, m) => s + (m.quantity || 0), 0);
                        const netDispatched = Math.max(0, totalDispatched - totalReturned);
                        const totalSold = itemSales.reduce((s, m) => s + (m.quantity || 0), 0);
                        const branchStockQty = item.inventory ? item.inventory.reduce((s, inv) => s + (inv.quantity || 0), 0) : 0;
                        const sellingPrice = Number(item.price || 0);
                        const actualSalesAmount = totalSold * sellingPrice;
                        const isReconciled = netDispatched === (totalSold + branchStockQty);

                        return `
                        <div class="bg-white dark:bg-gray-800 p-3 sm:p-3.5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-2xs space-y-2 flex flex-col justify-between hover:border-gray-300 dark:hover:border-gray-600 transition-all">
                            <div class="flex items-start justify-between gap-2">
                                <div class="min-w-0 flex-1">
                                    <h4 class="text-xs sm:text-sm font-black text-gray-900 dark:text-white leading-tight break-words">${item.name}</h4>
                                    <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                        <span class="text-[9px] sm:text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">${item.category || 'General'}</span>
                                        ${item.sku ? `<span class="text-[9px] text-gray-400 font-mono bg-gray-100 dark:bg-gray-700/60 px-1.5 py-0.2 rounded">SKU: ${item.sku}</span>` : ''}
                                    </div>
                                </div>
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${isReconciled ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200 dark:border-amber-800'} shrink-0">
                                    ${isReconciled ? 'Balanced' : 'Adjustment'}
                                </span>
                            </div>

                            <div class="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-start justify-between text-xs gap-2">
                                <div class="min-w-0">
                                    <span class="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 block leading-tight">Main / Branch</span>
                                    <span class="font-extrabold text-gray-900 dark:text-white text-xs sm:text-[13px]">${item.main_store_stock || 0} / ${branchStockQty}</span>
                                </div>
                                <div class="text-center min-w-0">
                                    <span class="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 block leading-tight">Dispatched / Sold</span>
                                    <span class="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs sm:text-[13px]">${totalDispatched} / ${totalSold}</span>
                                </div>
                                <div class="text-right min-w-0">
                                    <span class="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 block leading-tight">Sales Value</span>
                                    <span class="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs sm:text-[13px]">${window.fmt.currency(actualSalesAmount)}</span>
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            `}
        </div>
    </div>`;
}

window.setStockMovementTab = function(tab) {
    window.state._stockMovementTab = tab;
    const tabControls = document.getElementById('stockMovementsTabControls');
    if (tabControls) {
        const btns = tabControls.querySelectorAll('button');
        if (btns.length >= 2) {
            if (tab === 'ledger') {
                btns[0].className = 'px-4 py-2 rounded-xl text-xs font-bold transition-all bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm flex items-center gap-1.5';
                btns[1].className = 'px-4 py-2 rounded-xl text-xs font-bold transition-all text-gray-500 dark:text-gray-400 flex items-center gap-1.5';
            } else {
                btns[0].className = 'px-4 py-2 rounded-xl text-xs font-bold transition-all text-gray-500 dark:text-gray-400 flex items-center gap-1.5';
                btns[1].className = 'px-4 py-2 rounded-xl text-xs font-bold transition-all bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm flex items-center gap-1.5';
            }
        }
    }
    renderStockMovementsModule();
};

window.showStockReconciliationModal = function() {
    if (!window.currentReconciliationItems) return;

    const centralItems = window.currentReconciliationItems;
    const movements = window.currentReconciliationMovements || [];

    let recHtml = centralItems.map(item => {
        const costPrice = Number(item.cost_price || 0);
        const sellingPrice = Number(item.price || 0);

        const itemDispatches = movements.filter(m => m.central_item_id === item.id && m.movement_type === 'dispatch');
        const itemReturns = movements.filter(m => m.central_item_id === item.id && (m.movement_type === 'return_to_main' || m.movement_type === 'return'));
        const itemSales = movements.filter(m => m.central_item_id === item.id && m.movement_type === 'sale');

        const totalDispatched = itemDispatches.reduce((s, m) => s + (m.quantity || 0), 0);
        const totalReturned = itemReturns.reduce((s, m) => s + (m.quantity || 0), 0);
        const netDispatched = Math.max(0, totalDispatched - totalReturned);
        const totalSold = itemSales.reduce((s, m) => s + (m.quantity || 0), 0);

        const branchStockQty = item.inventory ? item.inventory.reduce((s, inv) => s + (inv.quantity || 0), 0) : 0;

        const actualSalesAmount = totalSold * sellingPrice;
        const remainingExpectedSales = branchStockQty * sellingPrice;
        const grossProfitEarned = totalSold * (sellingPrice - costPrice);

        const isReconciled = netDispatched === (totalSold + branchStockQty);
        const statusBadge = isReconciled ? `
            <span class="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">Balanced</span>
        ` : `
            <span class="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">Adjustment</span>
        `;

        return `
        <div class="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-150 dark:border-gray-750/60 space-y-2">
            <div class="flex justify-between items-start border-b border-gray-200/50 dark:border-gray-750 pb-1.5 mb-2">
                <div>
                    <span class="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs block">${item.name}</span>
                    <span class="text-[9px] text-gray-400">Cost: ${window.fmt.currency(costPrice)} | Price: ${window.fmt.currency(sellingPrice)}</span>
                </div>
                ${statusBadge}
            </div>
            <div class="space-y-1.5 text-[11px]">
                <div class="flex justify-between items-center">
                    <span class="text-gray-500 font-semibold uppercase tracking-wider text-[8px]">Main Store Qty</span>
                    <span class="font-bold text-indigo-600 dark:text-indigo-400">${item.main_store_stock || 0}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-500 font-semibold uppercase tracking-wider text-[8px]">Dispatched Qty</span>
                    <span class="font-bold text-amber-600 dark:text-amber-400">${totalDispatched}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-500 font-semibold uppercase tracking-wider text-[8px]">Sold Qty</span>
                    <span class="font-bold text-emerald-600 dark:text-emerald-400">${totalSold}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-500 font-semibold uppercase tracking-wider text-[8px]">Branch Stock</span>
                    <span class="font-bold text-gray-900 dark:text-white">${branchStockQty}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-500 font-semibold uppercase tracking-wider text-[8px]">Actual Sales</span>
                    <span class="font-bold text-emerald-600 dark:text-emerald-400">${window.fmt.currency(actualSalesAmount)}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-500 font-semibold uppercase tracking-wider text-[8px]">Remaining Exp. Sales</span>
                    <span class="font-bold text-indigo-600 dark:text-indigo-400">${window.fmt.currency(remainingExpectedSales)}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-500 font-semibold uppercase tracking-wider text-[8px]">Gross Profit Earned</span>
                    <span class="font-bold text-purple-600 dark:text-purple-400">${window.fmt.currency(grossProfitEarned)}</span>
                </div>
            </div>
        </div>`;
    }).join('');

    if (centralItems.length === 0) {
        recHtml = `<div class="py-12 text-center text-gray-400 text-sm">No reconciliation items found</div>`;
    }

    const modalHtml = `
        <div class="p-4 flex flex-col overflow-hidden">
            <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2.5 mb-3">
                <h3 class="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <i data-lucide="pie-chart" class="w-4 h-4 text-indigo-500"></i> ${window.t('click_see_reconciliation', 'Stock Reconciliation')}
                </h3>
                <button onclick="window.closeStockReconciliationModal()" class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto space-y-2.5 pr-0.5 scrollbar-custom">
                ${recHtml}
            </div>
            <div class="border-t border-gray-150 dark:border-gray-800 pt-3 mt-3 flex justify-end">
                <button onclick="window.closeStockReconciliationModal()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-all shadow-sm">
                    ${window.t('close', 'Close')}
                </button>
            </div>
        </div>
    `;

    openModal(modalHtml);
};

window.closeStockReconciliationModal = function() {
    closeModal();
};

