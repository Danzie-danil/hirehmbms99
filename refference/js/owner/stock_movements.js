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
                <div class="bg-white dark:bg-gray-800 px-4 py-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <p class="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('sales_revenue', 'Recorded Sales Revenue')}</p>
                    <p class="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 leading-tight">${window.fmt.currency(totalSalesRevenue)}</p>
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
        <div class="flex flex-wrap items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700">
            <div class="flex-1 relative min-w-[200px]">
                <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"></i>
                <input type="text" id="smSearchInput" placeholder="${window.t('search', 'Search')}..." value="${searchFilter}"
                    class="w-full pl-11 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                    style="padding-left: 2.85rem !important;"
                    oninput="window.filterStockMovementsTable(null, null, this.value)">
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

        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                    <tr>
                        <th class="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                        <th class="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">${window.t('movement_type', 'Type')}</th>
                        <th class="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">${window.t('item_name', 'Item Name')}</th>
                        <th class="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">${window.t('location_branch', 'Location / Branch')}</th>
                        <th class="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                        <th class="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">${window.t('cost_value', 'Cost Value')}</th>
                        <th class="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">${window.t('selling_value', 'Selling Value')}</th>
                        <th class="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">${window.t('notes_ref', 'Notes / Reference')}</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50 dark:divide-gray-800" id="stockMovementsTbody">
                    <tr><td colspan="8" class="py-12 text-center text-gray-400 text-sm">Loading ledger rows...</td></tr>
                </tbody>
            </table>
        </div>
    </div>`;
}

window.filterStockMovementsTable = function(branchVal, typeVal, searchVal) {
    if (branchVal !== undefined && branchVal !== null) window.state._stockMovementBranch = branchVal;
    if (typeVal !== undefined && typeVal !== null) window.state._stockMovementType = typeVal;
    if (searchVal !== undefined && searchVal !== null) window.state._stockMovementSearch = searchVal;

    const movements = window._cachedStockMovements || [];
    let branchFilter = window.state._stockMovementBranch || 'all';
    let typeFilter = window.state._stockMovementType || 'all';
    let searchFilter = window.state._stockMovementSearch || '';

    let filtered = [...movements];
    if (branchFilter !== 'all') {
        filtered = filtered.filter(m => m.branch_id === branchFilter);
    }
    if (typeFilter !== 'all') {
        filtered = filtered.filter(m => m.movement_type === typeFilter);
    }
    if (searchFilter) {
        filtered = filtered.filter(m => 
            m.item_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
            m.reference_no?.toLowerCase().includes(searchFilter.toLowerCase()) ||
            m.notes?.toLowerCase().includes(searchFilter.toLowerCase())
        );
    }

    window.currentMovements = filtered;

    const tbody = document.getElementById('stockMovementsTbody');
    if (!tbody) return;

    tbody.innerHTML = filtered.length === 0 ? `<tr><td colspan="8" class="py-12 text-center text-gray-400 text-sm">No stock movements found matching filter</td></tr>` :
    filtered.map(m => {
        const dateStr = new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const typeBadge = getTypeBadge(m.movement_type);
        const location = m.branches?.name || (m.movement_type === 'purchase' ? 'Main Store (Central)' : 'Central Store');

        return `
        <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
            <td class="px-5 py-3.5 text-xs text-gray-500 dark:text-gray-400 font-mono whitespace-nowrap">${dateStr}</td>
            <td class="px-5 py-3.5">${typeBadge}</td>
            <td class="px-5 py-3.5 font-bold text-gray-900 dark:text-white">${m.item_name}</td>
            <td class="px-5 py-3.5 text-xs font-semibold text-gray-600 dark:text-gray-300">${location}</td>
            <td class="px-5 py-3.5 text-right font-black text-gray-900 dark:text-white">${m.quantity}</td>
            <td class="px-5 py-3.5 text-right text-xs text-gray-500 dark:text-gray-400 font-mono">${window.fmt.currency(m.total_cost || 0)}</td>
            <td class="px-5 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">${window.fmt.currency(m.total_selling || 0)}</td>
            <td class="px-5 py-3.5 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]" title="${m.notes || ''}">
                ${m.reference_no ? `<span class="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-mono text-[10px] mr-1">#${m.reference_no}</span>` : ''}
                ${m.notes || '—'}
            </td>
        </tr>`;
    }).join('');

    if (window.lucide) window.lucide.createIcons({ scope: tbody });
};

function getTypeBadge(type) {
    switch (type) {
        case 'purchase':
            return `<span class="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider rounded-lg border border-indigo-200 dark:border-indigo-800">Purchase</span>`;
        case 'dispatch':
            return `<span class="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider rounded-lg border border-amber-200 dark:border-amber-800">Dispatch</span>`;
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

                            // Calculate dispatches & sales for this central item
                            const itemDispatches = movements.filter(m => m.central_item_id === item.id && m.movement_type === 'dispatch');
                            const itemSales = movements.filter(m => m.central_item_id === item.id && m.movement_type === 'sale');

                            const totalDispatched = itemDispatches.reduce((s, m) => s + (m.quantity || 0), 0);
                            const totalSold = itemSales.reduce((s, m) => s + (m.quantity || 0), 0);

                            const branchStockQty = item.inventory ? item.inventory.reduce((s, inv) => s + (inv.quantity || 0), 0) : 0;

                            const actualSalesAmount = totalSold * sellingPrice;
                            const remainingExpectedSales = branchStockQty * sellingPrice;
                            const grossProfitEarned = totalSold * (sellingPrice - costPrice);

                            // Reconciliation Check: Dispatched = Sold + Current Branch Stock
                            const isReconciled = totalDispatched === (totalSold + branchStockQty);

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
        <div class="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div>
                <h3 class="text-sm font-bold text-gray-900 dark:text-white">${window.t('reconciliation_table', 'Central vs Branch Stock Reconciliation')}</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">Balance check of main store dispatches vs branch sales and current stock levels</p>
            </div>
            <button onclick="window.showStockReconciliationModal()" class="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
                <i data-lucide="maximize-2" class="w-3.5 h-3.5"></i> ${window.t('view_breakdown', 'Detailed Breakdown')}
            </button>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                    <tr>
                        <th class="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">${window.t('item_name', 'Item Name')}</th>
                        <th class="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Main Store Qty</th>
                        <th class="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Dispatched Qty</th>
                        <th class="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Sold Qty</th>
                        <th class="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Branch Stock</th>
                        <th class="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Total Sales</th>
                        <th class="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
                    ${centralItems.length === 0 ? `<tr><td colspan="7" class="py-12 text-center text-gray-400 text-sm">No items found for reconciliation</td></tr>` :
                    centralItems.map(item => {
                        const itemDispatches = movements.filter(m => m.central_item_id === item.id && m.movement_type === 'dispatch');
                        const itemSales = movements.filter(m => m.central_item_id === item.id && m.movement_type === 'sale');
                        const totalDispatched = itemDispatches.reduce((s, m) => s + (m.quantity || 0), 0);
                        const totalSold = itemSales.reduce((s, m) => s + (m.quantity || 0), 0);
                        const branchStockQty = item.inventory ? item.inventory.reduce((s, inv) => s + (inv.quantity || 0), 0) : 0;
                        const sellingPrice = Number(item.price || 0);
                        const actualSalesAmount = totalSold * sellingPrice;
                        const isReconciled = totalDispatched === (totalSold + branchStockQty);

                        return `
                        <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                            <td class="px-5 py-3.5 font-bold text-gray-900 dark:text-white">${item.name}</td>
                            <td class="px-5 py-3.5 text-right font-bold text-indigo-600 dark:text-indigo-400">${item.main_store_stock || 0}</td>
                            <td class="px-5 py-3.5 text-right font-bold text-amber-600 dark:text-amber-400">${totalDispatched}</td>
                            <td class="px-5 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">${totalSold}</td>
                            <td class="px-5 py-3.5 text-right font-bold text-gray-900 dark:text-white">${branchStockQty}</td>
                            <td class="px-5 py-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">${window.fmt.currency(actualSalesAmount)}</td>
                            <td class="px-5 py-3.5 text-right">
                                ${isReconciled ? `<span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800">Balanced</span>` : `<span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800">Adjustment</span>`}
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
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
        const itemSales = movements.filter(m => m.central_item_id === item.id && m.movement_type === 'sale');

        const totalDispatched = itemDispatches.reduce((s, m) => s + (m.quantity || 0), 0);
        const totalSold = itemSales.reduce((s, m) => s + (m.quantity || 0), 0);

        const branchStockQty = item.inventory ? item.inventory.reduce((s, inv) => s + (inv.quantity || 0), 0) : 0;

        const actualSalesAmount = totalSold * sellingPrice;
        const remainingExpectedSales = branchStockQty * sellingPrice;
        const grossProfitEarned = totalSold * (sellingPrice - costPrice);

        const isReconciled = totalDispatched === (totalSold + branchStockQty);
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

