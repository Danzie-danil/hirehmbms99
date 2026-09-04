
import { state } from '../state.js';
import { dbBranches, dbQuotations } from '../db.js';
import { renderPremiumLoader, fmt, filterList, renderModuleOfflineState } from '../utils.js';

export async function renderOwnerQuotationsModule() {
    const area = document.getElementById('mainContent');
    if (!area) return;

    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);

    area.innerHTML = renderPremiumLoader('Loading quotations across all branches…');
    if (window.lucide) window.lucide.createIcons();

    try {
        const branches = state.branches || await dbBranches.fetchAll(ownerId);
        const quoteLists = await Promise.all(
            (branches || []).map(async b => {
                try {
                    const quotes = await dbQuotations.fetchAll(b.id);
                    return (quotes || []).map(q => ({ ...q, _branchName: b.name }));
                } catch (e) {
                    return [];
                }
            })
        );
        const allQuotes = quoteLists.flat();

        allQuotes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const totalValue = allQuotes.reduce((s, q) => s + (q.total_amount || 0), 0);
        const drafts = allQuotes.filter(q => q.status === 'draft').length;
        const sent = allQuotes.filter(q => q.status === 'sent').length;
        const accepted = allQuotes.filter(q => q.status === 'accepted').length;
        const rejected = allQuotes.filter(q => q.status === 'rejected').length;

        const filter = window._ownerQuoteFilter || 'all';

        const filtered = filter === 'all' ? allQuotes : allQuotes.filter(q => q.status === filter);

        const statusColors = {
            draft: 'bg-amber-50 text-amber-600 border-amber-100',
            sent: 'bg-blue-50 text-blue-600 border-blue-100',
            accepted: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            rejected: 'bg-red-50 text-red-500 border-red-100',
            converted: 'bg-indigo-50 text-indigo-600 border-indigo-100'
        };

        area.innerHTML = `
        <div class="max-w-6xl mx-auto space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                    <h2 class="text-xl sm:text-2xl font-black text-gray-900">${window.t('quotations_monitor', 'Quotations Monitor')}</h2>
                    <p class="text-sm text-gray-500 mt-0.5">${window.t('quotations_sub', 'Track all quotations across branches')}</p>
                </div>
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-6">
                <div class="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between">
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">${window.t('total', 'Total')}</p>
                    <p class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white truncate my-1">${allQuotes.length}</p>
                </div>
                <div class="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between">
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">${window.t('draft', 'Draft')}</p>
                    <p class="text-xl sm:text-2xl font-black text-amber-500 dark:text-amber-400 truncate my-1">${drafts}</p>
                </div>
                <div class="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between">
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">${window.t('sent', 'Sent')}</p>
                    <p class="text-xl sm:text-2xl font-black text-blue-500 dark:text-blue-400 truncate my-1">${sent}</p>
                </div>
                <div class="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between">
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">${window.t('accepted', 'Accepted')}</p>
                    <p class="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate my-1">${accepted}</p>
                </div>
                <div class="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between col-span-2 lg:col-span-1">
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">${window.t('total_value', 'Total Value')}</p>
                    <p class="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 truncate my-1" title="${fmt.currency(totalValue)}">${fmt.currency(totalValue)}</p>
                </div>
            </div>

            <!-- Filter Tabs -->
            <div class="flex gap-2 mb-4 flex-wrap">
                ${['all', 'draft', 'sent', 'accepted', 'rejected'].map(f => `
                    <button onclick="window._ownerQuoteFilter='${f}'; renderOwnerQuotationsModule()" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
                        ${f === 'all' ? `${window.t('all_requests', 'All')} (${allQuotes.length})` : `${window.t(f, f.charAt(0).toUpperCase() + f.slice(1))} (${allQuotes.filter(q => q.status === f).length})`}
                    </button>`).join('')}
            </div>

            <!-- Quotation List -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${filtered.length === 0 ? `
                    <div class="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                        <i data-lucide="file-signature" class="w-10 h-10 text-gray-300 mx-auto mb-3"></i>
                        <p class="text-gray-400 text-sm">${window.t('no_quotations_found', 'No quotations found')}</p>
                    </div>` :
                filtered.map(q => `
                    <div onclick="openEditModal('viewQuotation', '${q.id}')" class="bg-white border border-gray-200 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer">
                        <div class="flex items-start justify-between gap-3 mb-2">
                            <div>
                                <h4 class="font-bold text-gray-900 text-sm">${q.quote_number}</h4>
                                <p class="text-xs text-indigo-600 font-medium">${q._branchName}</p>
                            </div>
                            <span class="text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${statusColors[q.status] || statusColors.draft}">${q.status}</span>
                        </div>
                        <div class="flex items-center justify-between mt-3">
                            <p class="text-xs text-gray-500">${q.customer_name || 'Walk-in'}</p>
                            <p class="font-black text-gray-900 text-sm">${fmt.currency(q.total_amount || 0)}</p>
                        </div>
                        <div class="flex items-center justify-between mt-2">
                            <p class="text-[10px] text-gray-400">${new Date(q.created_at).toLocaleDateString()}</p>
                            ${q.valid_until ? `<p class="text-[10px] text-gray-400">Valid until: ${new Date(q.valid_until).toLocaleDateString()}</p>` : ''}
                        </div>
                    </div>`).join('')}
            </div>
        </div>`;
        lucide.createIcons();
    } catch (err) {
        console.error('[OwnerQuotations] Error loading quotations:', err);
        area.innerHTML = renderModuleOfflineState({
            viewId: 'quotations',
            title: 'Quotations',
            entityName: 'Quotation Records',
            retryAction: 'window.renderOwnerQuotationsModule()'
        });
        if (window.lucide) window.lucide.createIcons();
    }
};
