
export function renderRequestsModule(highlightId = null) {
    const container = document.getElementById('mainContent');
    container.innerHTML = `
    <div class="space-y-4 slide-in">
        <div class="flex flex-nowrap items-center gap-2 sm:gap-3 justify-between">
            <div class="inline-flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow overflow-hidden">
                <div class="bg-indigo-50 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider truncate">${window.t('requests_approvals', 'Requests & Approvals')}</div>
            </div>
            <div class="flex items-center gap-2">
                ${window.renderPremiumSelect({
        id: 'reqFilterStatus',
        selectedValue: 'pending',
        onchange: 'renderRequestsList()',
        options: [
            { value: 'pending', label: window.t('pending_only', 'Pending Only'), icon: 'clock' },
            { value: 'all', label: window.t('all_requests', 'All Requests'), icon: 'list' },
            { value: 'approved', label: window.t('approved', 'Approved'), icon: 'check-circle' },
            { value: 'rejected', label: window.t('rejected', 'Rejected'), icon: 'x-circle' }
        ],
        classes: 'w-32 sm:w-40'
    })}
            </div>
        </div>

        <div id="requestsList" class="space-y-4 pb-20 md:pb-0">
            ${renderPremiumLoader('Loading requests...')}
        </div>
    </div>`;
    lucide.createIcons();
    renderRequestsList(highlightId);
};

export async function renderRequestsList(highlightId = null) {
    const listContainer = document.getElementById('requestsList');
    const filter = document.getElementById('reqFilterStatus')?.value || 'pending';

    try {
        const allRequests = await dbRequests.fetchAll(state.profile?.id || state.ownerId);
        const requests = filter === 'all'
            ? allRequests
            : allRequests.filter(r => r.status === filter);

        if (requests.length === 0) {
            listContainer.innerHTML = `
            <div class="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                <i data-lucide="inbox" class="w-12 h-12 text-gray-200 mx-auto mb-3"></i>
                <p class="text-gray-400 font-medium">${window.t('no_pending_requests', 'No pending requests found')}</p>
            </div>`;
            lucide.createIcons();
            return;
        }

        listContainer.innerHTML = requests.map(req => {
            const isHighlighted = req.id === highlightId;
            const statusColors = {
                pending: 'border-l-indigo-500 bg-white dark:bg-gray-800',
                approved: 'border-l-emerald-500 bg-emerald-50/10 dark:bg-emerald-900/5',
                rejected: 'border-l-red-500 bg-red-50/10 dark:bg-red-900/5'
            };
            const badgeColors = {
                pending: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
                approved: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
                rejected: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
            };

            // ── Special rich card: Till Close Summary ──
            if (req.type === 'till_close_summary' && req.metadata) {
                const m = req.metadata;
                const variance = m.variance || 0;
                const varClass = variance === 0 ? 'text-emerald-600 dark:text-emerald-400' : variance > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400';
                return `
                <div id="req-${req.id}" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-[4px] ${statusColors[req.status]} rounded-2xl p-5 transition-all ${isHighlighted ? 'ring-2 ring-indigo-500 shadow-lg' : 'hover:shadow-md'} relative group">
                    <div class="flex items-start justify-between gap-4 mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                                <i data-lucide="banknote" class="w-5 h-5 text-emerald-600 dark:text-emerald-400"></i>
                            </div>
                            <div>
                                <h4 class="font-bold text-gray-900 dark:text-white leading-tight">${req.subject}</h4>
                                <p class="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">${req.branches?.name || ''} · ${fmt.dateTime(req.created_at)}</p>
                            </div>
                        </div>
                        <span class="badge ${badgeColors[req.status]} uppercase font-black tracking-tighter">${req.status}</span>
                    </div>
                    <div class="grid grid-cols-3 gap-2 mb-4">
                        <div class="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                            <p class="text-[10px] text-gray-400 font-bold uppercase">${window.t('expected_cash', 'Expected')}</p>
                            <p class="font-black text-indigo-600 dark:text-indigo-400 text-sm">${fmt.currency(m.expected_cash || 0)}</p>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                            <p class="text-[10px] text-gray-400 font-bold uppercase">${window.t('closing_count', 'Counted')}</p>
                            <p class="font-black text-gray-900 dark:text-white text-sm">${fmt.currency(m.closing_cash || 0)}</p>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                            <p class="text-[10px] text-gray-400 font-bold uppercase">${window.t('variance_label', 'Variance')}</p>
                            <p class="font-black text-sm ${varClass}">${variance >= 0 ? '+' : ''}${fmt.currency(variance)}</p>
                        </div>
                    </div>
                    ${m.discrepancy_note ? `
                    <div class="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl mb-4">
                        <p class="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 mb-1">${window.t('discrepancy_note', 'Discrepancy Note')}</p>
                        <p class="text-sm text-amber-900 dark:text-amber-300 italic">${m.discrepancy_note}</p>
                    </div>` : ''}
                    ${req.status === 'pending' ? `
                    <div class="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                        <button onclick="handleRequestAction('${req.id}', 'approved')" class="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-sm">
                            <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> ${window.t('approved', 'Acknowledge')}
                        </button>
                        <button onclick="handleRequestAction('${req.id}', 'rejected')" class="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-1.5">
                            <i data-lucide="flag" class="w-3.5 h-3.5"></i> ${window.t('rejected', 'Flag Issue')}
                        </button>
                    </div>` : `<div class="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-right">${window.t('completed', 'Processed')} ${fmt.date(req.updated_at || req.created_at)}</div>`}
                </div>`;
            }

            // ── Special rich card: Restock Request ──
            if (req.type === 'restock_request' && req.metadata) {
                const m = req.metadata;
                return `
                <div id="req-${req.id}" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-[4px] ${statusColors[req.status]} rounded-2xl p-5 transition-all ${isHighlighted ? 'ring-2 ring-indigo-500 shadow-lg' : 'hover:shadow-md'} relative group">
                    <div class="flex items-start justify-between gap-4 mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                                <i data-lucide="package" class="w-5 h-5 text-amber-600 dark:text-amber-400"></i>
                            </div>
                            <div>
                                <h4 class="font-bold text-gray-900 dark:text-white leading-tight">${req.subject}</h4>
                                <p class="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">${req.branches?.name || ''} · ${fmt.dateTime(req.created_at)}</p>
                            </div>
                        </div>
                        <span class="badge ${badgeColors[req.status]} uppercase font-black tracking-tighter">${req.status}</span>
                    </div>
                    <div class="grid grid-cols-3 gap-2 mb-4">
                        <div class="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                            <p class="text-[10px] text-gray-400 font-bold uppercase">${window.t('current_stock', 'Current Stock')}</p>
                            <p class="font-black text-red-600 dark:text-red-400 text-sm">${m.current_qty || 0} units</p>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                            <p class="text-[10px] text-gray-400 font-bold uppercase">${window.t('requested_qty', 'Requested Qty')}</p>
                            <p class="font-black text-amber-600 dark:text-amber-400 text-sm">${m.requested_qty || 0} units</p>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                            <p class="text-[10px] text-gray-400 font-bold uppercase">${window.t('suggested_qty', 'Suggested')}</p>
                            <p class="font-black text-indigo-600 dark:text-indigo-400 text-sm">${m.suggested_qty || 0} units</p>
                        </div>
                    </div>
                    ${m.reason ? `<div class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl mb-4 text-sm text-gray-700 dark:text-gray-300 italic">${m.reason}</div>` : ''}
                    ${req.status === 'pending' ? `
                    <div class="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                        <button onclick="handleRequestAction('${req.id}', 'approved')" class="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 shadow-sm">
                            <i data-lucide="send" class="w-3.5 h-3.5"></i> ${window.t('approve_restock', 'Approve & Dispatch')}
                        </button>
                        <button onclick="handleRequestAction('${req.id}', 'rejected')" class="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-1.5">
                            <i data-lucide="x-circle" class="w-3.5 h-3.5"></i> ${window.t('reject_restock', 'Reject')}
                        </button>
                        <button onclick="openAdminResponseModal('${req.id}')" class="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all flex items-center justify-center gap-1.5">
                            <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> ${window.t('notes', 'Note')}
                        </button>
                    </div>` : `<div class="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-right">${window.t('completed', 'Processed')} ${fmt.date(req.updated_at || req.created_at)}</div>`}
                </div>`;
            }

            // ── Special rich card: Stock Take ──
            if (req.type === 'stock_take' && req.metadata) {
                const m = req.metadata;
                const items = m.items || [];
                const withVariance = items.filter(i => i.variance !== 0);
                return `
                <div id="req-${req.id}" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-[4px] ${statusColors[req.status]} rounded-2xl p-5 transition-all ${isHighlighted ? 'ring-2 ring-indigo-500 shadow-lg' : 'hover:shadow-md'} relative group">
                    <div class="flex items-start justify-between gap-4 mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                                <i data-lucide="clipboard-check" class="w-5 h-5 text-purple-600 dark:text-purple-400"></i>
                            </div>
                            <div>
                                <h4 class="font-bold text-gray-900 dark:text-white leading-tight">${req.subject}</h4>
                                <p class="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">${req.branches?.name || ''} · ${fmt.dateTime(req.created_at)}</p>
                            </div>
                        </div>
                        <span class="badge ${badgeColors[req.status]} uppercase font-black tracking-tighter">${req.status}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 mb-4">
                        <div class="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                            <p class="text-[10px] text-gray-400 font-bold uppercase">${window.t('items_counted', 'Items Counted')}</p>
                            <p class="font-black text-gray-900 dark:text-white text-sm">${items.length}</p>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                            <p class="text-[10px] text-gray-400 font-bold uppercase">${window.t('items_with_variance', 'With Variance')}</p>
                            <p class="font-black text-sm ${withVariance.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}">${withVariance.length}</p>
                        </div>
                    </div>
                    ${withVariance.length > 0 ? `
                    <div class="overflow-x-auto mb-4">
                        <table class="w-full text-xs">
                            <thead><tr class="border-b border-gray-100 dark:border-gray-700">
                                <th class="text-left pb-2 text-gray-400 dark:text-gray-500 font-bold uppercase">${window.t('item_name', 'Item')}</th>
                                <th class="text-right pb-2 text-gray-400 dark:text-gray-500 font-bold uppercase">${window.t('system_count', 'System')}</th>
                                <th class="text-right pb-2 text-gray-400 dark:text-gray-500 font-bold uppercase">${window.t('physical_count', 'Physical')}</th>
                                <th class="text-right pb-2 text-gray-400 dark:text-gray-500 font-bold uppercase">${window.t('variance', 'Variance')}</th>
                            </tr></thead>
                            <tbody class="divide-y divide-gray-50 dark:divide-gray-700/50">
                                ${withVariance.map(i => `
                                <tr>
                                    <td class="py-2 font-semibold text-gray-900 dark:text-white">${i.name}</td>
                                    <td class="py-2 text-right text-gray-500 dark:text-gray-400">${i.system_qty}</td>
                                    <td class="py-2 text-right font-bold text-gray-900 dark:text-white">${i.physical_qty}</td>
                                    <td class="py-2 text-right font-black ${i.variance > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}">${i.variance > 0 ? '+' : ''}${i.variance}</td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>` : `<div class="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-sm text-emerald-700 dark:text-emerald-400 font-medium mb-4">${window.t('no_variances', 'No variances — stock is balanced!')}</div>`}
                    ${req.status === 'pending' ? `
                    <div class="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                        <button onclick="handleRequestAction('${req.id}', 'approved')" class="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-sm">
                            <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> ${window.t('stock_take_approved', 'Approve Adjustments')}
                        </button>
                        <button onclick="openAdminResponseModal('${req.id}')" class="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center justify-center gap-1.5">
                            <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> ${window.t('notes', 'Note')}
                        </button>
                    </div>` : `<div class="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-right">${window.t('completed', 'Processed')} ${fmt.date(req.updated_at || req.created_at)}</div>`}
                </div>`;
            }

            // ── Default card ──
            return `
            <div id="req-${req.id}" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-[4px] ${statusColors[req.status]} rounded-2xl p-5 md:p-6 transition-all ${isHighlighted ? 'ring-2 ring-indigo-500 shadow-lg' : 'hover:shadow-md'} relative group">
                <div class="flex items-start justify-between gap-4 mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 ${badgeColors[req.status]} rounded-xl flex items-center justify-center flex-shrink-0">
                            <i data-lucide="${req.type?.includes('inventory') ? 'package' : 'message-square'}" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-900 dark:text-white leading-tight">${req.subject}</h4>
                            <p class="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">${req.branches?.name || 'Unknown Branch'} · ${fmt.dateTime(req.created_at)}</p>
                        </div>
                    </div>
                    <span class="badge ${badgeColors[req.status]} uppercase font-black tracking-tighter">${req.status}</span>
                </div>

                <div class="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4 mb-4 border border-gray-100 dark:border-gray-700/50">
                    <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">${req.message}</p>
                    ${req.related_summary ? `<p class="mt-2 text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">Target: ${req.related_summary}</p>` : ''}
                </div>

                ${req.admin_response ? `
                <div class="bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl p-4 mb-4 border border-indigo-100/30 dark:border-indigo-800/20 relative group/resp">
                    <div class="flex items-center justify-between mb-1">
                        <p class="text-[10px] text-indigo-600 dark:text-indigo-400 font-black uppercase">Admin Response</p>
                        <button onclick="openAdminResponseModal('${req.id}')" class="opacity-0 group-hover/resp:opacity-100 transition-opacity text-[10px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                            <i data-lucide="edit-2" class="w-2.5 h-2.5"></i> ${window.t('edit', 'Edit')}
                        </button>
                    </div>
                    <p class="text-sm text-indigo-800 dark:text-indigo-300 italic font-medium leading-normal">"${req.admin_response}"</p>
                </div>` : ''}

                ${req.status === 'pending' ? `
                <div class="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 mt-4">
                    <button onclick="handleRequestAction('${req.id}', 'approved')" class="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 dark:shadow-none">
                        <i data-lucide="check-circle" class="w-4 h-4"></i> ${window.t('approved', 'Approve')}
                    </button>
                    <button onclick="handleRequestAction('${req.id}', 'rejected')" class="flex-1 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 transition-all flex items-center justify-center gap-2">
                        <i data-lucide="x-circle" class="w-4 h-4"></i> ${window.t('rejected', 'Reject')}
                    </button>
                    <button onclick="openAdminResponseModal('${req.id}')" class="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold uppercase hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all flex items-center justify-center gap-2">
                        <i data-lucide="message-circle" class="w-4 h-4"></i> ${window.t('notes', 'Comment')}
                    </button>
                </div>` : `
                <div class="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-right">${window.t('completed', 'Processed on')} ${fmt.date(req.updated_at || req.created_at)}</div>
                `}
            </div>`;
        }).join('');
        lucide.createIcons();


        if (highlightId) {
            document.getElementById(`req-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    } catch (err) {
        console.error('[OwnerRequests] Error loading requests:', err);
        if (typeof window.renderModuleOfflineState === 'function') {
            listContainer.innerHTML = window.renderModuleOfflineState({
                viewId: 'requests',
                title: 'Branch Requests',
                entityName: 'Branch Requisition Requests',
                retryAction: 'window.renderRequestsList()'
            });
            if (window.lucide) window.lucide.createIcons();
        } else {
            listContainer.innerHTML = `<p class="p-10 text-center text-gray-500 font-bold">Couldn't load branch requests while offline.</p>`;
        }
    }
};
export async function handleRequestAction(id, status) {
    const isApprove = status === 'approved';
    let adminResponse = null;
    if (status === 'rejected') {
        adminResponse = await promptModal('Reject Request', 'Please enter a reason for rejection (optional):', 'e.g. Price is too high, out of stock...');
        if (adminResponse === null) return;
    } else {
        const confirmed = await confirmModal(
            isApprove ? 'Approve Request' : 'Reject Request',
            `Are you sure you want to mark this request as ${status}?`,
            isApprove ? 'Approve' : 'Reject',
            'Cancel'
        );
        if (!confirmed) return;
    }

    try {
        const allRequests = await dbRequests.fetchAll(state.profile?.id || state.ownerId);
        const req = allRequests.find(r => r.id === id);
        if (!req) return;

        if (status === 'approved') {
            if (req.type === 'inventory_add' && req.metadata) {
                const { name, sku, category, price, quantity, min_threshold, supplier, cost_price } = req.metadata;

                const addedItem = await dbInventory.add(req.branch_id, { name, sku, category, price, quantity, min_threshold });

                await dbInventoryPurchases.add({
                    branch_id: req.branch_id,
                    inventory_id: addedItem.id,
                    request_id: req.id,
                    supplier_info: supplier || 'Unknown',
                    quantity: quantity,
                    cost_price: cost_price || 0,
                    purchase_date: new Date().toISOString().split('T')[0]
                });
            } else if (req.type === 'inventory_update' && req.metadata) {
                const { inventory_id, quantity, supplier, cost_price } = req.metadata;

                const { data: item } = await supabaseClient.from('inventory').select('quantity').eq('id', inventory_id).single();
                if (item) {
                    await dbInventory.updateQty(inventory_id, item.quantity + quantity);

                    await dbInventoryPurchases.add({
                        branch_id: req.branch_id,
                        inventory_id: inventory_id,
                        request_id: req.id,
                        supplier_info: supplier || 'Unknown',
                        quantity: quantity,
                        cost_price: cost_price || 0,
                        purchase_date: new Date().toISOString().split('T')[0]
                    });
                }
            }
        }

        const updatePayload = { status };
        if (adminResponse) updatePayload.admin_response = adminResponse;

        await dbRequests.update(id, updatePayload);
        showToast(`Request ${status} successfully!`, 'success');
        renderRequestsList();
    } catch (err) {
        showToast('Error processing request: ' + err.message, 'error');
    }
};

export async function openAdminResponseModal(id) {

    const allRequests = await dbRequests.fetchAll(state.profile?.id || state.ownerId);
    const req = allRequests.find(r => r.id === id);
    const existingResponse = req?.admin_response || '';

    const response = await promptModal(
        existingResponse ? 'Edit Response' : 'Add Admin Response',
        'Enter your response/comment for the branch:',
        'e.g. Please provide more details...',
        existingResponse
    );
    if (response === null) return;

    dbRequests.update(id, { admin_response: response }).then(() => {
        showToast('Response updated!');
        renderRequestsList();
    }).catch(err => {
        showToast('Failed to send response: ' + err.message, 'error');
    });
};
