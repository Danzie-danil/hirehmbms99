
import { state } from '../state.js';
import { dbBranches, dbSuppliers, dbPurchaseOrders } from '../db.js';
import { renderPremiumLoader, fmt, showToast, confirmModal, openModal, filterList, renderModuleOfflineState } from '../utils.js';

export async function renderOwnerSuppliersModule() {
    const area = document.getElementById('mainContent');
    if (!area) return;

    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);

    area.innerHTML = renderPremiumLoader('Loading suppliers & purchase orders…');
    if (window.lucide) window.lucide.createIcons();

    try {
        const [branches, suppliers, allPOs] = await Promise.race([
            (async () => {
                const bList = state.branches || await dbBranches.fetchAll(ownerId).catch(() => []);
                const sList = await dbSuppliers.fetchAll(ownerId).catch(() => []);
                const poLists = await Promise.all(
                    (bList || []).map(async b => {
                        try {
                            const pos = await dbPurchaseOrders.fetchAll(b.id);
                            return (pos || []).map(po => ({ ...po, _branchName: b.name }));
                        } catch (e) {
                            return [];
                        }
                    })
                );
                return [bList, sList, poLists.flat()];
            })(),
            new Promise(resolve => setTimeout(() => resolve([state.branches || [], [], []]), 10000))

        ]);

        allPOs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const pendingPOs = allPOs.filter(p => p.status === 'pending').length;
        const approvedPOs = allPOs.filter(p => p.status === 'approved').length;
        const totalPOValue = allPOs.reduce((s, p) => s + (p.total_amount || 0), 0);

        const activeTab = window._ownerSupTab || 'suppliers';

        area.innerHTML = `
        <div class="max-w-6xl mx-auto space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                    <h2 class="text-xl sm:text-2xl font-black text-gray-900">${window.t('suppliers_pos_monitor', 'Suppliers & POs Monitor')}</h2>
                    <p class="text-sm text-gray-500 mt-0.5">${window.t('suppliers_sub', 'Manage suppliers and track purchase orders')}</p>
                </div>
                <!-- Search & Actions -->
                <div class="flex items-center gap-2">
                    <div class="relative flex-1 sm:min-w-[240px]">
                        <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10"></i>
                        <input type="text" placeholder="${window.t('search_suppliers_pos', 'Search suppliers or POs...')}" oninput="filterList('${activeTab === 'suppliers' ? 'supplierList' : 'poList'}', this.value)" class="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" style="padding-left: 2.85rem !important;">
                    </div>
                    ${activeTab === 'suppliers' ? `
                    <button onclick="openModal('addSupplier')" class="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        <span class="hidden sm:inline">${window.t('add_supplier', 'Add Supplier')}</span>
                    </button>
                    ` : ''}
                </div>
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-6">
                <div class="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('suppliers', 'Suppliers')}</p>
                    <p class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white truncate my-1">${suppliers.length}</p>
                </div>
                <div class="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between">
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">${window.t('total_pos', 'Total POs')}</p>
                    <p class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white truncate my-1">${allPOs.length}</p>
                </div>
                <div class="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between">
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">${window.t('pending', 'Pending')}</p>
                    <p class="text-xl sm:text-2xl font-black text-amber-500 dark:text-amber-400 truncate my-1">${pendingPOs}</p>
                </div>
                <div class="relative px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">${window.t('total_value', 'Total Value')}</p>
                    <p class="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 truncate my-1" title="${fmt.currency(totalPOValue)}">${fmt.number(totalPOValue)}</p>
                </div>
            </div>

            <!-- Tabs -->
            <div class="flex gap-2 mb-4">
                <button onclick="window._ownerSupTab='suppliers'; renderOwnerSuppliersModule()" class="px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === 'suppliers' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
                    ${window.t('suppliers', 'Suppliers')} (${suppliers.length})
                </button>
                <button onclick="window._ownerSupTab='pos'; renderOwnerSuppliersModule()" class="px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === 'pos' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
                    ${window.t('purchase_orders', 'Purchase Orders')} (${allPOs.length})
                </button>
            </div>

            <!-- Content Container with ID for filtering -->
            <div id="${activeTab === 'suppliers' ? 'supplierList' : 'poList'}" class="space-y-3">
                ${activeTab === 'suppliers' ? renderOwnerSuppliersList(suppliers) : renderOwnerPOsList(allPOs)}
            </div>
        </div>`;
        lucide.createIcons();
    } catch (err) {
        console.error('[OwnerSuppliers] Error loading data:', err);
        area.innerHTML = renderModuleOfflineState({
            viewId: 'suppliers',
            title: 'Suppliers & Purchase Orders',
            entityName: 'Supplier & Purchase Order Data',
            retryAction: 'window.renderOwnerSuppliersModule()'
        });
        if (window.lucide) window.lucide.createIcons();
    }
};

function renderOwnerSuppliersList(suppliers) {
    if (suppliers.length === 0) return `
        <div class="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl">
            <i data-lucide="truck" class="w-10 h-10 text-gray-300 mx-auto mb-3"></i>
            <p class="text-gray-400 text-sm">No suppliers found</p>
            <button onclick="openModal('addSupplier')" class="mt-4 text-indigo-600 font-bold hover:underline text-sm">+ Add your first supplier</button>
        </div>`;

    return suppliers.map(s => `
        <div onclick="openEditModal('editSupplier', '${s.id}')" data-search="${(s.name || '').toLowerCase()} ${(s.contact_person || '').toLowerCase()}" class="bg-white border border-gray-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group">
            <div class="flex items-start justify-between gap-3 mb-2">
                <h4 class="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">${s.name || 'Unnamed'}</h4>
                ${s.status === 'active'
            ? '<span class="bg-emerald-50 text-emerald-600 text-[10px] px-2 py-0.5 rounded font-bold uppercase border border-emerald-100">Active</span>'
            : '<span class="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded font-bold uppercase border border-gray-200">Inactive</span>'}
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-50">
                <div>
                   <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 pl-1">Contact</p>
                   <p class="text-xs text-gray-700 font-bold"><i data-lucide="user" class="w-3 h-3 inline mr-1 text-gray-300"></i>${s.contact_person || 'N/A'}</p>
                </div>
                <div>
                   <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 pl-1">Phone</p>
                   <p class="text-xs text-gray-700 font-bold"><i data-lucide="phone" class="w-3 h-3 inline mr-1 text-gray-300"></i>${s.phone || 'N/A'}</p>
                </div>
                <div>
                   <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 pl-1">Email</p>
                   <p class="text-xs text-gray-700 font-bold truncate"><i data-lucide="mail" class="w-3 h-3 inline mr-1 text-gray-300"></i>${s.email || 'N/A'}</p>
                </div>
                <div>
                   <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 pl-1">Address</p>
                   <p class="text-xs text-gray-700 font-bold truncate"><i data-lucide="map-pin" class="w-3 h-3 inline mr-1 text-gray-300"></i>${s.address || 'N/A'}</p>
                </div>
            </div>
        </div>`).join('');
}

function renderOwnerPOsList(pos) {
    if (pos.length === 0) return `
        <div class="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl">
            <i data-lucide="file-text" class="w-10 h-10 text-gray-300 mx-auto mb-3"></i>
            <p class="text-gray-400 text-sm">No purchase orders found</p>
        </div>`;

    const statusColors = {
        pending: 'bg-amber-50 text-amber-600 border-amber-100',
        approved: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        received: 'bg-blue-50 text-blue-600 border-blue-100',
        cancelled: 'bg-red-50 text-red-500 border-red-100'
    };

    return pos.map(po => `
        <div onclick="openEditModal('viewPO', '${po.id}')" data-search="${(po.po_number || '').toLowerCase()} ${(po.supplier_name || po.suppliers?.name || '').toLowerCase()}" class="bg-white border border-gray-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group">
            <div class="flex items-start justify-between gap-3 mb-2">
                <div>
                    <h4 class="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">${po.po_number || 'N/A'}</h4>
                    <p class="text-[10px] text-indigo-600 font-black uppercase tracking-widest mt-0.5">${po._branchName}</p>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${statusColors[po.status] || statusColors.pending}">${po.status}</span>
            </div>
            <div class="flex items-end justify-between mt-4">
                <div>
                    <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Supplier</p>
                    <p class="text-sm font-bold text-gray-700">${po.supplier_name || po.suppliers?.name || 'Unknown'}</p>
                </div>
                <div class="text-right">
                    <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Amount</p>
                    <p class="text-lg font-black text-emerald-600 leading-none">${fmt.currency(po.total_amount || 0)}</p>
                </div>
            </div>
            <div class="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
                 <p class="text-[10px] text-gray-400 font-bold"><i data-lucide="calendar" class="w-3 h-3 inline mr-1"></i>${new Date(po.created_at).toLocaleDateString()}</p>
                 <span class="text-[10px] font-bold text-indigo-500 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">View Details <i data-lucide="arrow-right" class="w-3 h-3"></i></span>
            </div>
        </div>`).join('');
}
