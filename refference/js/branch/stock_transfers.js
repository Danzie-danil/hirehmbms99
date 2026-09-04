
export async function renderStockTransfersModule() {
    const container = document.getElementById('mainContent');
    container.innerHTML = renderPremiumLoader('Loading stock transfers...');
    lucide.createIcons();

    try {

        const { data: allBranches } = await supabaseClient
            .from('branches')
            .select('id, name, owner_id')
            .eq('owner_id', state.ownerId || state.ownerIdForBranch);

        const otherBranches = (allBranches || []).filter(b => b.id !== state.branchId);

        const { data: transfers, error } = await supabaseClient
            .from('stock_transfers')
            .select('*, from_branch:branches!stock_transfers_from_branch_id_fkey(name), to_branch:branches!stock_transfers_to_branch_id_fkey(name)')
            .or(`from_branch_id.eq.${state.branchId},to_branch_id.eq.${state.branchId}`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const outgoing = (transfers || []).filter(t => t.from_branch_id === state.branchId);
        const incoming = (transfers || []).filter(t => t.to_branch_id === state.branchId);

        const savedTab = state._transferTab || 'outgoing';

        const statusStyles = {
            pending: { badge: 'bg-amber-100 text-amber-700', label: 'Pending' },
            approved: { badge: 'bg-blue-100 text-blue-700', label: 'Approved' },
            completed: { badge: 'bg-emerald-100 text-emerald-700', label: 'Completed' },
            rejected: { badge: 'bg-red-100 text-red-700', label: 'Rejected' }
        };

        container.innerHTML = `
        <div class="space-y-4 slide-in">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="inline-flex items-center gap-2 bg-white border border-gray-200 shadow-sm rounded-2xl p-1 pr-5">
                    <div class="bg-cyan-50 text-cyan-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider">Stock Transfers</div>
                </div>
                <button onclick="openTransferModal()" class="btn-primary gap-2 text-sm px-4 py-2 rounded-xl">
                    <i data-lucide="arrow-right-left" class="w-4 h-4"></i> Request Transfer
                </button>
            </div>

            <!-- Tabs -->
            <div class="flex bg-gray-100 rounded-2xl p-1 gap-1 w-fit">
                <button onclick="state._transferTab='outgoing'; renderStockTransfersModule()"
                    class="px-4 py-2 rounded-xl text-sm font-bold transition-all ${savedTab === 'outgoing' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}">
                    Outgoing (${outgoing.length})
                </button>
                <button onclick="state._transferTab='incoming'; renderStockTransfersModule()"
                    class="px-4 py-2 rounded-xl text-sm font-bold transition-all ${savedTab === 'incoming' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}">
                    Incoming (${incoming.length})
                </button>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                ${(() => {
                const list = savedTab === 'outgoing' ? outgoing : incoming;
                if (list.length === 0) return `
                    <div class="py-16 text-center text-gray-400">
                        <i data-lucide="arrow-right-left" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                        <p class="text-sm font-medium">No ${savedTab} transfers</p>
                    </div>`;
                return `
                    <div class="divide-y divide-gray-50">
                        ${list.map(t => {
                    const style = statusStyles[t.status] || statusStyles.pending;
                    const isIncoming = t.to_branch_id === state.branchId;
                    return `
                            <div class="px-5 py-4 hover:bg-gray-50 transition-colors">
                                <div class="flex items-start justify-between mb-2">
                                    <div class="flex items-start gap-3">
                                        <div class="w-9 h-9 rounded-xl ${isIncoming ? 'bg-blue-50' : 'bg-orange-50'} flex items-center justify-center flex-shrink-0">
                                            <i data-lucide="${isIncoming ? 'download' : 'upload'}" class="w-4 h-4 ${isIncoming ? 'text-blue-600' : 'text-orange-600'}"></i>
                                        </div>
                                        <div>
                                            <p class="font-bold text-gray-900">${t.item_name}</p>
                                            <div class="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                                                <span>${t.from_branch?.name || 'Unknown'}</span>
                                                <i data-lucide="arrow-right" class="w-3 h-3"></i>
                                                <span>${t.to_branch?.name || 'Unknown'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="text-sm font-black text-gray-900">×${t.quantity}</span>
                                        <span class="text-xs font-bold px-2 py-0.5 rounded-full ${style.badge}">${style.label}</span>
                                    </div>
                                </div>
                                ${t.notes ? `<p class="text-xs text-gray-400 ml-12">${t.notes}</p>` : ''}
                                <p class="text-xs text-gray-300 ml-12 mt-1">${fmt.dateTime(t.created_at)}</p>
                            </div>`;
                }).join('')}
                    </div>`;
            })()}
            </div>
        </div>`;
        lucide.createIcons();
    } catch (err) {
        document.getElementById('mainContent').innerHTML = `<div class="py-20 text-center text-red-500">Failed: ${err.message}</div>`;
    }
};

window.openTransferModal = async function () {
    const { data: allBranches } = await supabaseClient
        .from('branches')
        .select('id, name');
    const others = (allBranches || []).filter(b => b.id !== state.branchId);

    if (others.length === 0) { showToast('No other branches available for transfer', 'info'); return; }

    const { data: inventory } = await supabaseClient.from('inventory').select('id, name, quantity').eq('branch_id', state.branchId).order('name');

    const modalHtml = `
    <div class="p-6">
        <div class="flex items-center justify-between mb-5">
            <h3 class="text-xl font-bold text-gray-900">Request Stock Transfer</h3>
            <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Destination Branch *</label>
                ${window.renderPremiumSelect({
        id: 'transferToBranch',
        selectedValue: others[0]?.id || '',
        searchable: others.length > 4,
        options: others.map(b => ({ value: b.id, label: b.name, icon: 'map-pin' }))
    })}
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Item *</label>
                ${inventory?.length > 0 ? window.renderPremiumSelect({
        id: 'transferItem',
        selectedValue: inventory[0]?.id || '',
        searchable: true,
        options: inventory.map(i => ({ value: i.name, label: `${i.name} (${i.quantity} in stock)`, icon: 'package' }))
    }) : `<input type="text" id="transferItem" class="form-input w-full" placeholder="Enter item name">`}
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Quantity *</label>
                <input type="number" id="transferQty" class="form-input w-full" placeholder="e.g. 10" min="1">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                <textarea id="transferNotes" class="form-input w-full" rows="2" placeholder="Reason for transfer..."></textarea>
            </div>
        </div>
        <div class="flex gap-3 mt-6">
            <button onclick="closeModal()" class="flex-1 py-2.5 rounded-xl font-medium hover: text-sm bg-red-600 text-white hover:bg-red-700 shadow-sm font-bold border-none">Cancel</button>
            <button onclick="submitStockTransfer()" class="flex-1 py-2.5 bg-cyan-600 text-white rounded-xl font-bold hover:bg-cyan-700 text-sm">Request Transfer</button>
        </div>
    </div>`;
    openModal(modalHtml);
};

window.submitStockTransfer = async function () {
    const toBranchId = document.getElementById('transferToBranch')?.value;
    const itemName = document.getElementById('transferItem')?.value?.trim() || document.getElementById('transferItem')?.value;
    const qty = parseInt(document.getElementById('transferQty')?.value || '0');
    const notes = document.getElementById('transferNotes')?.value?.trim();

    if (!toBranchId || !itemName || qty < 1) { showToast('All fields are required', 'error'); return; }

    try {
        const { error } = await supabaseClient.from('stock_transfers').insert({
            owner_id: state.ownerId || state.ownerIdForBranch,
            from_branch_id: state.branchId,
            to_branch_id: toBranchId,
            item_name: itemName,
            quantity: qty,
            notes,
            status: 'pending'
        });
        if (error) throw error;
        showToast('Transfer request submitted!', 'success');
        closeModal();
        renderStockTransfersModule();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};
