import { state } from '../state.js';
import { dbAssets, dbAssetMaintenance, dbBranches, dbExpenses, dbCapital } from '../db.js';
import { renderPremiumLoader, showToast, renderModuleOfflineState } from '../utils.js';
import { supabase } from '../supabase.js';

let realtimeChannel = null;
window._batchAssetsList = [];

function parseCleanNumber(val) {
    if (val === null || val === undefined || val === '') return 0;
    const cleanStr = String(val).replace(/,/g, '').trim();
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
}

export async function renderOwnerAssetsModule() {
    const area = document.getElementById('mainContent');
    if (!area) return;

    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    if (!ownerId) {
        area.innerHTML = renderModuleOfflineState({
            viewId: 'assets',
            title: 'Fixed Assets & Maintenance',
            entityName: 'Business Assets',
            retryAction: 'window.renderOwnerAssetsModule()'
        });
        return;
    }

    area.innerHTML = renderPremiumLoader('Loading business fixed assets & dedicated maintenance history...');
    if (window.lucide) window.lucide.createIcons();

    setupRealtimeAssetsSubscription(ownerId);

    try {
        const [assets, maintenanceLogs, branches] = await Promise.all([
            dbAssets.fetchAll(ownerId).catch(() => []),
            dbAssetMaintenance.fetchAll(ownerId).catch(() => []),
            state.branches || dbBranches.fetchAll(ownerId).catch(() => [])
        ]);

        window._rawAssetsList = assets;
        window._rawMaintenanceLogs = maintenanceLogs;

        const branchMap = new Map((branches || []).map(b => [b.id, b.name]));

        let totalAssetCost = 0;
        let totalBookValue = 0;
        let totalMaintenanceCost = 0;

        assets.forEach(a => {
            totalAssetCost += parseCleanNumber(a.purchase_cost);
            totalBookValue += parseCleanNumber(a.current_book_value || a.purchase_cost);
        });

        maintenanceLogs.forEach(m => {
            totalMaintenanceCost += parseCleanNumber(m.cost);
        });

        const activeAssetsCount = assets.filter(a => a.status === 'active').length;
        const maintenanceCount = assets.filter(a => a.status === 'under_maintenance').length;

        // Custom Lists Filter & Search State
        const activeFilter = state._assetsListFilter || 'all';
        const searchKeyword = (state._assetsListSearch || '').toLowerCase().trim();

        // Filter Assets
        const filteredAssets = assets.filter(a => {
            if (activeFilter === 'active' && a.status !== 'active') return false;
            if (activeFilter === 'under_maintenance' && a.status !== 'under_maintenance') return false;
            if (activeFilter === 'machinery' && a.category !== 'machinery') return false;
            if (activeFilter === 'vehicle' && a.category !== 'vehicle') return false;
            if (activeFilter === 'it_hardware' && a.category !== 'it_hardware') return false;
            if (activeFilter.startsWith('branch_') && a.branch_id !== activeFilter.replace('branch_', '')) return false;

            if (searchKeyword) {
                const matchName = (a.asset_name || '').toLowerCase().includes(searchKeyword);
                const matchCategory = (a.category || '').toLowerCase().includes(searchKeyword);
                const matchSerial = (a.serial_number || '').toLowerCase().includes(searchKeyword);
                if (!matchName && !matchCategory && !matchSerial) return false;
            }
            return true;
        });

        const currencySymbol = (window.fmt && window.fmt.getSymbol) ? window.fmt.getSymbol() : 'TSh';

        area.innerHTML = `
            <div class="space-y-6">
                <!-- Clean Standard Header Banner -->
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                            <i data-lucide="box" class="w-4 h-4"></i>
                            Asset Management & Servicing Engine
                        </div>
                        <h2 class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Fixed Assets & Dedicated Maintenance</h2>
                        <p class="text-xs text-gray-500 dark:text-gray-400">Track machinery, vehicles, store fixtures, depreciation schedules & dedicated maintenance logs</p>
                    </div>
                    <div class="flex flex-col items-stretch sm:items-end gap-2 shrink-0 w-full sm:w-auto">
                        <button onclick="window.renderAddAssetView()" class="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer">
                            <i data-lucide="plus" class="w-4 h-4"></i> Add Assets (Single / Batch)
                        </button>
                        <button onclick="window.renderAddMaintenanceView()" class="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer">
                            <i data-lucide="wrench" class="w-4 h-4"></i> Log Maintenance / Service
                        </button>
                    </div>
                </div>

                <!-- KPI Cards -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div class="relative bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between h-full stat-card min-w-0">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-2xs z-10">${currencySymbol}</div>
                        <div class="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-2">
                            <span class="text-xs font-bold uppercase tracking-wider">Total Asset Valuation</span>
                            <div class="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                                <i data-lucide="box" class="w-4 h-4"></i>
                            </div>
                        </div>
                        <h3 class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white truncate my-1" title="${window.fmt.currency(totalAssetCost)}">${window.fmt.number(totalAssetCost)}</h3>
                        <p class="text-[11px] text-gray-400 mt-1">Total initial purchase cost</p>
                    </div>

                    <div class="relative bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between h-full stat-card min-w-0">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">${currencySymbol}</div>
                        <div class="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-2">
                            <span class="text-xs font-bold uppercase tracking-wider">Current Book Value</span>
                            <div class="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                <i data-lucide="trending-up" class="w-4 h-4"></i>
                            </div>
                        </div>
                        <h3 class="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate my-1" title="${window.fmt.currency(totalBookValue)}">${window.fmt.number(totalBookValue)}</h3>
                        <p class="text-[11px] text-gray-400 mt-1">Post-depreciation balance</p>
                    </div>

                    <div class="relative bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between h-full stat-card min-w-0">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs z-10">${currencySymbol}</div>
                        <div class="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-2">
                            <span class="text-xs font-bold uppercase tracking-wider">Total Maintenance Spent</span>
                            <div class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                                <i data-lucide="wrench" class="w-4 h-4"></i>
                            </div>
                        </div>
                        <h3 class="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 truncate my-1" title="${window.fmt.currency(totalMaintenanceCost)}">${window.fmt.number(totalMaintenanceCost)}</h3>
                        <p class="text-[11px] text-gray-400 mt-1">Servicing & repairs expenditure</p>
                    </div>

                    <div class="relative bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between h-full stat-card min-w-0">
                        <div class="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-2">
                            <span class="text-xs font-bold uppercase tracking-wider">Active vs Service</span>
                            <div class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                                <i data-lucide="cpu" class="w-4 h-4"></i>
                            </div>
                        </div>
                        <h3 class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white truncate my-1">${activeAssetsCount} Active <span class="text-xs font-medium text-amber-500">(${maintenanceCount} repair)</span></h3>
                        <p class="text-[11px] text-gray-400 mt-1">Equipment operational status</p>
                    </div>
                </div>

                <!-- Custom Lists & Filter Bar -->
                <div class="bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white">Fixed Assets Custom Lists</h3>
                            <p class="text-xs text-gray-500 dark:text-gray-400">Filter registered equipment by machinery type, status & branch</p>
                        </div>
                        <!-- Search Box -->
                        <div class="relative w-full sm:w-64">
                            <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text" value="${state._assetsListSearch || ''}" oninput="window.setAssetsSearch(this.value)" placeholder="Search asset name, category or serial..." class="form-input w-full pl-9 py-1.5 text-xs font-bold rounded-xl">
                        </div>
                    </div>

                    <!-- Custom Filter Pills -->
                    <div id="assetsFilterPillsContainer" class="flex items-center gap-2 overflow-x-auto pb-1 scroller-custom">
                        ${renderAssetsFilterPillsHTML(assets, activeFilter)}
                    </div>

                    <!-- Asset Registry List -->
                    <div id="assetsGridContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                        ${renderAssetsGridHTML(filteredAssets, branchMap)}
                    </div>
                </div>

                <!-- Maintenance Audit History -->
                <div class="bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white">Dedicated Asset Servicing & Repair History</h3>
                            <p class="text-xs text-gray-500 dark:text-gray-400">Scheduled servicing, parts replacement & repair expenses</p>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs">
                            <thead class="bg-gray-50 dark:bg-gray-900/50 text-gray-500 uppercase text-[10px] font-bold tracking-wider border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th class="p-3">Service Date</th>
                                    <th class="p-3">Asset Unit</th>
                                    <th class="p-3">Cost</th>
                                    <th class="p-3">Contractor / Technician</th>
                                    <th class="p-3">Work Done</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                                ${maintenanceLogs.length > 0 ? maintenanceLogs.map(m => {
                                    const parentAsset = assets.find(a => a.id === m.asset_id);
                                    return `
                                    <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td class="p-3 font-medium text-gray-900 dark:text-white">${m.service_date}</td>
                                        <td class="p-3 font-bold text-gray-900 dark:text-white">${parentAsset ? parentAsset.asset_name : 'Asset'}</td>
                                        <td class="p-3 font-bold text-amber-600 dark:text-amber-400">${window.fmt.currency(m.cost || 0)}</td>
                                        <td class="p-3 text-gray-500 dark:text-gray-400">${m.contractor_name || '-'}</td>
                                        <td class="p-3 text-gray-500 dark:text-gray-400">${m.work_description || '-'}</td>
                                    </tr>
                                `;
                                }).join('') : `
                                    <tr>
                                        <td colspan="5" class="py-8 text-center text-gray-400">No maintenance servicing records logged yet.</td>
                                    </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        console.error('[OwnerAssets] Error loading asset data:', err);
        area.innerHTML = renderModuleOfflineState({
            viewId: 'assets',
            title: 'Fixed Assets & Maintenance',
            entityName: 'Business Assets',
            retryAction: 'window.renderOwnerAssetsModule()'
        });
        if (window.lucide) window.lucide.createIcons();
    }
}

function renderAssetsFilterPillsHTML(assets, activeFilter) {
    return `
        <button onclick="window.setAssetsListFilter('all')" class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${activeFilter === 'all' ? 'bg-amber-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
            All Assets (${assets.length})
        </button>
        <button onclick="window.setAssetsListFilter('active')" class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${activeFilter === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
            🟢 Active (${assets.filter(a => a.status === 'active').length})
        </button>
        <button onclick="window.setAssetsListFilter('under_maintenance')" class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${activeFilter === 'under_maintenance' ? 'bg-amber-500 text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
            🔧 Under Maintenance (${assets.filter(a => a.status === 'under_maintenance').length})
        </button>
        <button onclick="window.setAssetsListFilter('machinery')" class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${activeFilter === 'machinery' ? 'bg-blue-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
            ⚙️ Machinery (${assets.filter(a => a.category === 'machinery').length})
        </button>
        <button onclick="window.setAssetsListFilter('vehicle')" class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${activeFilter === 'vehicle' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
            🚚 Vehicles (${assets.filter(a => a.category === 'vehicle').length})
        </button>
        <button onclick="window.setAssetsListFilter('it_hardware')" class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${activeFilter === 'it_hardware' ? 'bg-purple-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
            💻 IT & Electronics (${assets.filter(a => a.category === 'it_hardware').length})
        </button>
    `;
}

function renderAssetsGridHTML(filteredAssets, branchMap) {
    if (!filteredAssets || filteredAssets.length === 0) {
        return `
            <div class="col-span-full py-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                <i data-lucide="filter" class="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2"></i>
                <p class="text-gray-400 text-sm font-medium">No assets match the selected custom list filter.</p>
                <button onclick="window.setAssetsListFilter('all')" class="mt-3 px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-xs cursor-pointer">Clear Custom Filter</button>
            </div>
        `;
    }

    return filteredAssets.map(a => `
        <div class="border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-4 bg-slate-50/50 dark:bg-gray-900/40 hover:border-amber-300 transition-all flex flex-col justify-between space-y-3">
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-bold uppercase px-2.5 py-0.5 rounded-lg border ${a.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' : a.status === 'under_maintenance' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300'}">
                        ${a.status.replace('_', ' ')}
                    </span>
                    <span class="text-[11px] text-amber-600 dark:text-amber-400 font-bold">${a.category.toUpperCase()}</span>
                </div>
                <h4 class="font-bold text-gray-900 dark:text-white text-base leading-tight">${a.asset_name}</h4>
                <p class="text-xs text-gray-400 mt-1">Location: ${a.branch_id ? (branchMap?.get?.(a.branch_id) || 'Branch') : 'Global'} ${a.serial_number ? '• S/N: ' + a.serial_number : ''}</p>
            </div>
            <div class="space-y-1.5 pt-2 border-t border-gray-200/60 dark:border-gray-750">
                <div class="flex items-center justify-between text-xs">
                    <span class="text-gray-400">Purchase Cost:</span>
                    <span class="font-bold text-gray-900 dark:text-white">${window.fmt.currency(a.purchase_cost || 0)}</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                    <span class="text-gray-400">Book Value:</span>
                    <span class="font-bold text-emerald-600 dark:text-emerald-400">${window.fmt.currency(a.current_book_value || a.purchase_cost || 0)}</span>
                </div>
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-gray-750">
                <button onclick="window.renderAddMaintenanceView('${a.id}')" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 font-bold rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer">
                    <i data-lucide="wrench" class="w-3.5 h-3.5"></i> Maintenance
                </button>
                <div class="flex items-center gap-1">
                    <button onclick="window.renderAddAssetView('${a.id}')" title="Edit Asset Details" class="p-1.5 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button onclick="window.deleteAsset('${a.id}')" title="Delete Asset" class="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

window.setAssetsListFilter = function(filterKey) {
    state._assetsListFilter = filterKey;
    const pillsContainer = document.getElementById('assetsFilterPillsContainer');
    const gridContainer = document.getElementById('assetsGridContainer');

    if (pillsContainer && gridContainer && window._rawAssetsList) {
        const activeFilter = state._assetsListFilter || 'all';
        const searchKeyword = (state._assetsListSearch || '').toLowerCase().trim();
        const branchMap = new Map((state.branches || []).map(b => [b.id, b.name]));

        const filteredAssets = window._rawAssetsList.filter(a => {
            if (activeFilter === 'active' && a.status !== 'active') return false;
            if (activeFilter === 'under_maintenance' && a.status !== 'under_maintenance') return false;
            if (activeFilter === 'machinery' && a.category !== 'machinery') return false;
            if (activeFilter === 'vehicle' && a.category !== 'vehicle') return false;
            if (activeFilter === 'it_hardware' && a.category !== 'it_hardware') return false;
            if (activeFilter.startsWith('branch_') && a.branch_id !== activeFilter.replace('branch_', '')) return false;

            if (searchKeyword) {
                const matchName = (a.asset_name || '').toLowerCase().includes(searchKeyword);
                const matchCategory = (a.category || '').toLowerCase().includes(searchKeyword);
                const matchSerial = (a.serial_number || '').toLowerCase().includes(searchKeyword);
                if (!matchName && !matchCategory && !matchSerial) return false;
            }
            return true;
        });

        pillsContainer.innerHTML = renderAssetsFilterPillsHTML(window._rawAssetsList, activeFilter);
        gridContainer.innerHTML = renderAssetsGridHTML(filteredAssets, branchMap);
        if (window.lucide) window.lucide.createIcons();
    } else {
        window.renderOwnerAssetsModule();
    }
};

window.setAssetsSearch = function(val) {
    state._assetsListSearch = val;
    window.setAssetsListFilter(state._assetsListFilter || 'all');
};

function setupRealtimeAssetsSubscription(ownerId) {
    if (realtimeChannel) return;
    try {
        realtimeChannel = supabase
            .channel('public:assets_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'business_assets', filter: `owner_id=eq.${ownerId}` }, () => {
                if (document.getElementById('mainContent')?.querySelector('[data-view="assets"]') || window.location.hash.includes('assets')) {
                    window.renderOwnerAssetsModule();
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'asset_maintenance_logs', filter: `owner_id=eq.${ownerId}` }, () => {
                if (document.getElementById('mainContent')?.querySelector('[data-view="assets"]') || window.location.hash.includes('assets')) {
                    window.renderOwnerAssetsModule();
                }
            })
            .subscribe();
    } catch (e) {
        console.warn('[OwnerAssets] Realtime subscription error:', e);
    }
}

export async function renderAddAssetView(editAssetId = null) {
    const area = document.getElementById('mainContent');
    if (!area) return;

    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    const [branches, capitalAccounts] = await Promise.all([
        state.branches || dbBranches.fetchAll(ownerId).catch(() => []),
        dbCapital.fetchAccounts(ownerId).catch(() => [])
    ]);

    window._batchAssetsList = window._batchAssetsList || [];

    let editAsset = null;
    if (editAssetId) {
        editAsset = (window._rawAssetsList || []).find(a => a.id === editAssetId);
    }

    area.innerHTML = `
    <div class="page-container w-full h-full bg-slate-50/50 dark:bg-gray-900 rounded-none border-0 shadow-none overflow-hidden flex flex-col font-['Inter',sans-serif]">
        <!-- Top Nav Header -->
        <div class="modal-top-nav flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none">
            <div class="flex items-center gap-3">
                <button type="button" onclick="renderOwnerAssetsModule()" class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200 dark:border-gray-700">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    <span>Close</span>
                </button>
                <div class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-base shrink-0 border border-amber-100 dark:border-amber-900">
                    <i data-lucide="${editAsset ? 'edit-2' : 'box'}" class="w-4 h-4"></i>
                </div>
                <div>
                    <h3 class="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">
                        ${editAsset ? `Edit Asset: ${editAsset.asset_name}` : 'Register Business Fixed Assets (Single / Batch)'}
                    </h3>
                    <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Add single or multiple equipment & machinery items to your batch list before submitting</p>
                </div>
            </div>
            ${!editAsset ? `
                <div id="batchAssetBadgeCount" class="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-extrabold text-xs">
                    Batch Items: ${window._batchAssetsList.length}
                </div>
            ` : ''}
        </div>

        <!-- Form Body -->
        <form onsubmit="event.preventDefault(); window.handleSaveAssetBatch('${editAssetId || ''}');" class="flex flex-col flex-1 overflow-hidden">
            <div class="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6 scroller-custom">
                
                <div class="bg-white dark:bg-gray-800/90 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
                    <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-750 pb-3">
                        <h4 class="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                            <i data-lucide="${editAsset ? 'edit-3' : 'plus-circle'}" class="w-4 h-4 text-amber-500"></i> Asset Details Entry
                        </h4>
                        ${!editAsset ? `
                            <button type="button" onclick="window.addItemToAssetsBatch()" class="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-amber-200 dark:border-amber-900">
                                <i data-lucide="plus" class="w-4 h-4"></i> Add Item to Batch List
                            </button>
                        ` : ''}
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Asset Name *</label>
                            <input type="text" id="astName" value="${editAsset ? editAsset.asset_name || '' : ''}" class="form-input w-full font-bold" placeholder="e.g. Delivery Van, Generator 15kVA, POS Counter 1">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Category *</label>
                            ${window.renderPremiumSelect ? window.renderPremiumSelect({
                                id: 'astCategory',
                                selectedValue: editAsset ? editAsset.category : 'machinery',
                                searchable: false,
                                options: [
                                    { value: 'machinery', label: 'Machinery & Equipment', icon: 'cog' },
                                    { value: 'vehicle', label: 'Vehicles & Transport', icon: 'truck' },
                                    { value: 'it_hardware', label: 'IT Hardware & Computers', icon: 'laptop' },
                                    { value: 'furniture', label: 'Store Fixtures & Furniture', icon: 'armchair' },
                                    { value: 'property', label: 'Real Estate / Property', icon: 'building' },
                                    { value: 'tools', label: 'Tools & Utensils', icon: 'wrench' },
                                    { value: 'other', label: 'Other Assets', icon: 'box' }
                                ]
                            }) : ''}
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Branch / Location Assigned</label>
                            ${window.renderPremiumSelect ? window.renderPremiumSelect({
                                id: 'astBranch',
                                selectedValue: editAsset ? (editAsset.branch_id || '') : '',
                                searchable: branches.length > 4,
                                options: [
                                    { value: '', label: 'Global (All Locations)', icon: 'globe' },
                                    ...branches.map(b => ({ value: b.id, label: b.name, icon: 'map-pin' }))
                                ]
                            }) : ''}
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Funding Capital Account Source (Deduction)</label>
                            ${window.renderPremiumSelect ? window.renderPremiumSelect({
                                id: 'astCapitalSource',
                                selectedValue: '',
                                searchable: capitalAccounts.length > 4,
                                options: [
                                    { value: '', label: 'Unlinked (No Capital Deduction)', icon: 'minus-circle' },
                                    ...capitalAccounts.map(c => ({ value: c.id, label: `${c.account_name} (${window.fmt.currency(c.balance || 0)})`, icon: 'wallet' }))
                                ]
                            }) : ''}
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Purchase Cost (TZS) *</label>
                            <input type="text" inputmode="decimal" id="astCost" value="${editAsset && editAsset.purchase_cost != null ? editAsset.purchase_cost : ''}" class="form-input w-full font-black text-amber-600" placeholder="e.g. 4500000">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Purchase Date *</label>
                            <input type="date" id="astDate" class="form-input w-full font-bold" value="${editAsset ? editAsset.purchase_date : new Date().toISOString().slice(0, 10)}">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Useful Life (Years)</label>
                            <input type="text" inputmode="numeric" id="astLife" value="${editAsset && editAsset.useful_life_years != null ? editAsset.useful_life_years : ''}" class="form-input w-full font-bold" placeholder="e.g. 5">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Serial Number / Tag</label>
                            <input type="text" id="astSerial" value="${editAsset ? editAsset.serial_number || '' : ''}" class="form-input w-full font-mono" placeholder="e.g. SN-88491">
                        </div>
                    </div>
                </div>

                <!-- Batch Staging List Table (Hidden when editing) -->
                ${!editAsset ? `
                    <div class="bg-white dark:bg-gray-800/90 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <h4 class="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                    <i data-lucide="layers" class="w-4 h-4 text-indigo-500"></i> Staged Batch Items List
                                </h4>
                                <p class="text-xs text-gray-500 dark:text-gray-400">Review items in your batch queue before submitting</p>
                            </div>
                            ${window._batchAssetsList.length > 0 ? `
                                <button type="button" onclick="window.clearAssetsBatchList()" class="text-xs text-red-500 font-bold hover:underline">
                                    Clear Batch
                                </button>
                            ` : ''}
                        </div>

                        <div id="batchAssetsTableContainer" class="overflow-x-auto">
                            ${renderBatchAssetsTableHtml()}
                        </div>
                    </div>
                ` : ''}
            </div>

            <!-- Bottom Action Nav Footer -->
            <div class="modal-bottom-nav flex-none p-3.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-between px-6 z-20">
                <button type="button" onclick="renderOwnerAssetsModule()" class="px-6 py-2 rounded-full font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all cursor-pointer">
                    Cancel
                </button>
                <div class="flex items-center gap-3">
                    ${!editAsset ? `
                        <button type="button" onclick="window.addItemToAssetsBatch()" class="px-5 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full font-bold text-xs hover:bg-gray-200 transition-all cursor-pointer flex items-center gap-1.5">
                            <i data-lucide="plus" class="w-4 h-4"></i> Add to Batch List
                        </button>
                    ` : ''}
                    <button type="submit" id="btnSubmitAssetsBatch" class="px-6 py-2 bg-[#2c3e50] hover:bg-[#1a252f] text-white rounded-full font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2">
                        <span>${editAsset ? 'Update Asset Details' : window._batchAssetsList.length > 0 ? `Save All ${window._batchAssetsList.length} Assets` : 'Save Asset'}</span>
                    </button>
                </div>
            </div>
        </form>
    </div>`;

    if (window.lucide) window.lucide.createIcons();
}

function renderBatchAssetsTableHtml() {
    const list = window._batchAssetsList || [];
    const branches = state.branches || [];
    const branchMap = new Map(branches.map(b => [b.id, b.name]));

    if (list.length === 0) {
        return `
            <div class="py-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                <i data-lucide="box" class="w-8 h-8 text-gray-300 mx-auto mb-1"></i>
                <p class="text-xs text-gray-400 font-medium">No items added to batch yet. Fill details above and click "+ Add Item to Batch List"</p>
            </div>
        `;
    }

    let totalValuation = 0;
    list.forEach(i => totalValuation += parseCleanNumber(i.purchase_cost));

    return `
        <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-gray-50 dark:bg-gray-900/50 text-gray-500 uppercase text-[10px] font-bold">
                <tr>
                    <th class="p-2.5">#</th>
                    <th class="p-2.5">Asset Name</th>
                    <th class="p-2.5">Category</th>
                    <th class="p-2.5">Location</th>
                    <th class="p-2.5">Cost (TZS)</th>
                    <th class="p-2.5">Serial</th>
                    <th class="p-2.5 text-right">Action</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                ${list.map((item, idx) => `
                    <tr class="hover:bg-gray-50/50">
                        <td class="p-2.5 font-bold text-gray-400">${idx + 1}</td>
                        <td class="p-2.5 font-bold text-gray-900 dark:text-white">${item.asset_name}</td>
                        <td class="p-2.5 text-amber-600 font-bold">${item.category.toUpperCase()}</td>
                        <td class="p-2.5 text-gray-500">${item.branch_id ? (branchMap.get(item.branch_id) || 'Branch') : 'Global'}</td>
                        <td class="p-2.5 font-bold text-emerald-600">${window.fmt.currency(item.purchase_cost)}</td>
                        <td class="p-2.5 text-gray-400 font-mono">${item.serial_number || '-'}</td>
                        <td class="p-2.5 text-right">
                            <button type="button" onclick="window.removeAssetFromBatch(${idx})" class="p-1 text-red-500 hover:bg-red-50 rounded-lg">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
            <tfoot class="border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 font-bold text-xs">
                <tr>
                    <td colspan="4" class="p-2.5 text-gray-700 dark:text-gray-300">Total Batch (${list.length} Items):</td>
                    <td colspan="3" class="p-2.5 text-emerald-600 font-black">${window.fmt.currency(totalValuation)}</td>
                </tr>
            </tfoot>
        </table>
    `;
}

window.addItemToAssetsBatch = function() {
    const name = document.getElementById('astName')?.value?.trim();
    const category = document.getElementById('astCategory')?.value;
    const branchId = document.getElementById('astBranch')?.value || null;
    const capitalAccountId = document.getElementById('astCapitalSource')?.value || null;
    const cost = parseCleanNumber(document.getElementById('astCost')?.value);
    const pDate = document.getElementById('astDate')?.value;
    const lifeYears = parseCleanNumber(document.getElementById('astLife')?.value) || 5;
    const serial = document.getElementById('astSerial')?.value?.trim();

    if (!name || !cost || !pDate) {
        if (window.showToast) window.showToast('Please enter asset name, purchase cost, and date before adding to batch list', 'error');
        return;
    }

    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);

    window._batchAssetsList = window._batchAssetsList || [];
    window._batchAssetsList.push({
        owner_id: ownerId,
        branch_id: branchId,
        capital_account_id: capitalAccountId,
        asset_name: name,
        category: category,
        purchase_cost: cost,
        purchase_date: pDate,
        useful_life_years: lifeYears,
        current_book_value: cost,
        serial_number: serial,
        status: 'active'
    });

    if (document.getElementById('astName')) document.getElementById('astName').value = '';
    if (document.getElementById('astCost')) document.getElementById('astCost').value = '';
    if (document.getElementById('astSerial')) document.getElementById('astSerial').value = '';

    if (window.showToast) window.showToast(`Added "${name}" to batch list!`, 'success');
    window.updateBatchAssetsUI();
};

window.removeAssetFromBatch = function(index) {
    if (!window._batchAssetsList) return;
    window._batchAssetsList.splice(index, 1);
    window.updateBatchAssetsUI();
};

window.clearAssetsBatchList = function() {
    window._batchAssetsList = [];
    window.updateBatchAssetsUI();
};

window.updateBatchAssetsUI = function() {
    const container = document.getElementById('batchAssetsTableContainer');
    if (container) container.innerHTML = renderBatchAssetsTableHtml();
    const badge = document.getElementById('batchAssetBadgeCount');
    if (badge) badge.innerText = `Batch Items: ${(window._batchAssetsList || []).length}`;
    const btnSubmit = document.getElementById('btnSubmitAssetsBatch');
    if (btnSubmit) {
        const count = (window._batchAssetsList || []).length;
        btnSubmit.innerHTML = `<span>${count > 0 ? `Save All ${count} Assets` : 'Save Asset'}</span>`;
    }
    if (window.lucide) window.lucide.createIcons();
};

window.handleSaveAssetBatch = async function(editAssetId = null) {
    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    const name = document.getElementById('astName')?.value?.trim();
    const category = document.getElementById('astCategory')?.value;
    const branchId = document.getElementById('astBranch')?.value || null;
    const capitalAccountId = document.getElementById('astCapitalSource')?.value || null;
    const cost = parseCleanNumber(document.getElementById('astCost')?.value);
    const pDate = document.getElementById('astDate')?.value;
    const lifeYears = parseCleanNumber(document.getElementById('astLife')?.value) || 5;
    const serial = document.getElementById('astSerial')?.value?.trim();

    if (editAssetId) {
        if (!name || !cost || !pDate) {
            if (window.showToast) window.showToast('Asset name, purchase cost, and date are required', 'error');
            return;
        }
        try {
            await dbAssets.update(editAssetId, {
                asset_name: name,
                category: category,
                branch_id: branchId,
                purchase_cost: cost,
                purchase_date: pDate,
                useful_life_years: lifeYears,
                serial_number: serial
            });

            if (capitalAccountId && cost > 0) {
                await dbCapital.adjustBalance(capitalAccountId, -cost, {
                    notes: `Asset Acquisition: ${name}`
                });
            }

            if (window.showToast) window.showToast(`Successfully updated asset details!`, 'success');
            window.renderOwnerAssetsModule();
        } catch (err) {
            console.error('[UpdateAsset] Error:', err);
            if (window.showToast) window.showToast('Failed to update asset: ' + err.message, 'error');
        }
        return;
    }

    if (name && cost && pDate) {
        window._batchAssetsList = window._batchAssetsList || [];
        window._batchAssetsList.push({
            owner_id: ownerId,
            branch_id: branchId,
            capital_account_id: capitalAccountId,
            asset_name: name,
            category: category,
            purchase_cost: cost,
            purchase_date: pDate,
            useful_life_years: lifeYears,
            current_book_value: cost,
            serial_number: serial,
            status: 'active'
        });
    }

    const items = window._batchAssetsList || [];
    if (items.length === 0) {
        if (window.showToast) window.showToast('Please enter asset details or add items to batch list first', 'error');
        return;
    }

    try {
        await dbAssets.addBatch(items);

        // Deduct capital balances for items linked to capital accounts
        for (const item of items) {
            if (item.capital_account_id && item.purchase_cost > 0) {
                await dbCapital.adjustBalance(item.capital_account_id, -item.purchase_cost, {
                    notes: `Fixed Asset Acquisition: ${item.asset_name}`
                });
            }
        }

        if (window.showToast) window.showToast(`Successfully registered ${items.length} fixed asset(s)!`, 'success');
        window._batchAssetsList = [];
        window.renderOwnerAssetsModule();
    } catch (err) {
        console.error('[SaveAssetBatch] Error:', err);
        if (window.showToast) window.showToast('Failed to register batch assets: ' + err.message, 'error');
    }
};

export async function renderAddMaintenanceView(preselectAssetId = null) {
    const area = document.getElementById('mainContent');
    if (!area) return;
    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    const [assets, capitalAccounts] = await Promise.all([
        dbAssets.fetchAll(ownerId).catch(() => []),
        dbCapital.fetchAccounts(ownerId).catch(() => [])
    ]);

    area.innerHTML = `
    <div class="page-container w-full h-full bg-slate-50/50 dark:bg-gray-900 rounded-none border-0 shadow-none overflow-hidden flex flex-col font-['Inter',sans-serif]">
        <!-- Top Nav Header -->
        <div class="modal-top-nav flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none">
            <button type="button" onclick="renderOwnerAssetsModule()" class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200 dark:border-gray-700">
                <i data-lucide="chevron-left" class="w-4 h-4"></i>
                <span>Close</span>
            </button>
            <div class="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-base shrink-0 border border-indigo-100 dark:border-indigo-900">
                <i data-lucide="wrench" class="w-4 h-4"></i>
            </div>
            <div>
                <h3 class="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">Log Asset Maintenance / Service</h3>
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Record servicing, repairs, parts replaced & auto-link expense</p>
            </div>
        </div>

        <!-- Form Body -->
        <form onsubmit="event.preventDefault(); window.handleSaveMaintenance();" class="flex flex-col flex-1 overflow-hidden">
            <div class="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-4 scroller-custom">
                <div class="bg-white dark:bg-gray-800/90 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Select Asset *</label>
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'mntAssetId',
                            selectedValue: preselectAssetId || assets[0]?.id || '',
                            searchable: assets.length > 4,
                            options: assets.map(a => ({ value: a.id, label: `${a.asset_name} (${a.category})`, icon: 'box' }))
                        }) : ''}
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Maintenance Type *</label>
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'mntType',
                            selectedValue: 'routine_service',
                            searchable: false,
                            options: [
                                { value: 'routine_service', label: 'Routine Servicing / Inspection', icon: 'check-circle' },
                                { value: 'emergency_breakdown', label: 'Emergency Breakdown Repair', icon: 'alert-triangle' },
                                { value: 'part_replacement', label: 'Spare Part Replacement', icon: 'wrench' },
                                { value: 'upgrade', label: 'Equipment Upgrade', icon: 'arrow-up' }
                            ]
                        }) : ''}
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Payment Source Capital Account (Deduction)</label>
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'mntCapitalSource',
                            selectedValue: '',
                            searchable: capitalAccounts.length > 4,
                            options: [
                                { value: '', label: 'Unlinked (No Capital Deduction)', icon: 'minus-circle' },
                                ...capitalAccounts.map(c => ({ value: c.id, label: `${c.account_name} (${window.fmt.currency(c.balance || 0)})`, icon: 'wallet' }))
                            ]
                        }) : ''}
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Service Date *</label>
                            <input type="date" id="mntDate" required class="form-input w-full font-bold" value="${new Date().toISOString().slice(0, 10)}">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Cost (TZS) *</label>
                            <input type="text" inputmode="decimal" id="mntCost" required class="form-input w-full font-black text-indigo-600" placeholder="e.g. 150000">
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Service Provider / Technician</label>
                            <input type="text" id="mntProvider" class="form-input w-full" placeholder="e.g. AutoTech Garage, TechCare Solutions">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Next Service Due Date (Optional)</label>
                            <input type="date" id="mntNextDate" class="form-input w-full font-bold">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Notes & Repaired Components</label>
                        <textarea id="mntNotes" rows="3" class="form-input w-full" placeholder="Replaced oil filter, generator spark plugs..."></textarea>
                    </div>
                </div>
            </div>

            <!-- Bottom Action Nav Footer -->
            <div class="modal-bottom-nav flex-none p-3.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                <button type="button" onclick="renderOwnerAssetsModule()" class="px-6 py-2 rounded-full font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all cursor-pointer">
                    Cancel
                </button>
                <button type="submit" class="px-6 py-2 bg-[#2c3e50] hover:bg-[#1a252f] text-white rounded-full font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2">
                    <span>Record Maintenance</span>
                </button>
            </div>
        </form>
    </div>`;

    if (window.lucide) window.lucide.createIcons();
}

window.deleteAsset = async function(id) {
    if (!confirm('Are you sure you want to delete this fixed asset?')) return;
    try {
        await dbAssets.delete(id);
        if (window.showToast) window.showToast('Asset deleted.', 'success');
        window.renderOwnerAssetsModule();
    } catch (e) {
        if (window.showToast) window.showToast('Error deleting asset: ' + e.message, 'error');
    }
};

window.handleSaveMaintenance = async function() {
    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    const assetId = document.getElementById('mntAssetId')?.value;
    const type = document.getElementById('mntType')?.value;
    const date = document.getElementById('mntDate')?.value;
    const cost = parseCleanNumber(document.getElementById('mntCost')?.value);
    const provider = document.getElementById('mntProvider')?.value?.trim();
    const nextDate = document.getElementById('mntNextDate')?.value || null;
    const notes = document.getElementById('mntNotes')?.value?.trim();
    const capitalAccountId = document.getElementById('mntCapitalSource')?.value || null;

    if (!assetId || !type || !date) {
        if (window.showToast) window.showToast('Please select asset, type and date', 'error');
        return;
    }

    try {
        await dbAssetMaintenance.add({
            asset_id: assetId,
            owner_id: ownerId,
            maintenance_type: type,
            service_date: date,
            cost: cost,
            service_provider: provider,
            next_service_due: nextDate,
            notes: notes
        });

        if (capitalAccountId && cost > 0) {
            const rawAssets = window._rawAssetsList || [];
            const parentAsset = rawAssets.find(a => a.id === assetId);
            await dbCapital.adjustBalance(capitalAccountId, -cost, {
                notes: `Asset Maintenance: ${parentAsset ? parentAsset.asset_name : 'Equipment Service'}`
            });
        }

        if (cost > 0 && dbExpenses) {
            try {
                await dbExpenses.add({
                    owner_id: ownerId,
                    category: 'Asset Maintenance & Repairs',
                    amount: cost,
                    expense_date: date,
                    notes: `Asset Maintenance: ${notes || provider || 'Equipment repair'}`
                });
            } catch (exErr) {
                console.warn('[SaveMaintenance] Expense auto-log warning:', exErr);
            }
        }

        if (window.showToast) window.showToast('Asset maintenance logged successfully!', 'success');
        window.renderOwnerAssetsModule();
    } catch (err) {
        console.error('[SaveMaintenance] Error:', err);
        if (window.showToast) window.showToast('Failed to log maintenance: ' + err.message, 'error');
    }
};

window.openAddAssetModal = renderAddAssetView;
window.renderAddAssetView = renderAddAssetView;
window.openAddMaintenanceModal = renderAddMaintenanceView;
window.renderAddMaintenanceView = renderAddMaintenanceView;
window.renderOwnerAssetsModule = renderOwnerAssetsModule;
