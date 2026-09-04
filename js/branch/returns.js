
export async function renderReturnsModule() {
    const container = document.getElementById('mainContent');
    container.innerHTML = renderPremiumLoader('Loading returns...');
    lucide.createIcons();

    try {
        const returns = await (window.dbReturns ? window.dbReturns.fetchAll(state.branchId).catch(() => []) : []);


        const pending = (returns || []).filter(r => r.status === 'pending');
        const approved = (returns || []).filter(r => r.status === 'approved');
        const totalRefund = approved.reduce((s, r) => s + Number(r.return_amount), 0);

        const statusStyles = {
            pending: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
            approved: { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
            rejected: { badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' }
        };

        container.innerHTML = `
        <div class="space-y-4 slide-in">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="inline-flex items-center gap-2 bg-white border border-gray-200 shadow-sm rounded-2xl p-1 pr-5">
                    <div class="bg-rose-50 text-rose-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider">↩ ${window.t('product_returns_title', 'Product Returns')}</div>
                </div>
                <button onclick="openReturnModal()" class="btn-primary gap-2 text-sm px-4 py-2 rounded-xl">
                    <i data-lucide="plus" class="w-4 h-4"></i> ${window.t('btn_new_return', 'New Return')}
                </button>
            </div>

            <div class="grid grid-cols-3 gap-3">
                <div class="bg-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm stat-card">
                    <p class="text-xs text-gray-500 uppercase tracking-tight font-bold">${window.t('total_returns', 'Total Returns')}</p>
                    <p class="text-2xl font-black text-gray-900 mt-1">${(returns || []).length}</p>
                </div>
                <div class="bg-amber-50 px-4 py-3 rounded-2xl border border-amber-100 shadow-sm stat-card">
                    <p class="text-xs text-amber-600 uppercase tracking-tight font-bold">${window.t('pending_returns', 'Pending')}</p>
                    <p class="text-2xl font-black text-amber-700 mt-1">${pending.length}</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">${window.t('total_refunded', 'Total Refunded')}</p>
                    <p class="text-2xl font-black text-red-600 dark:text-red-400 mt-1" title="${fmt.currency(totalRefund)}">${fmt.number(totalRefund)}</p>
                </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="px-5 py-4 border-b border-gray-100">
                    <h3 class="font-bold text-gray-900">${window.t('return_records', 'Return Records')}</h3>
                </div>
                ${(returns || []).length === 0 ? `
                <div class="py-16 text-center text-gray-400">
                    <i data-lucide="package-open" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                    <p class="text-sm font-medium">${window.t('no_returns_yet', 'No returns yet')}</p>
                    <p class="text-xs mt-1">Submit product returns using the button above</p>
                </div>` : `
                <div class="divide-y divide-gray-50">
                    ${(returns || []).map(r => {
            const style = statusStyles[r.status] || statusStyles.pending;
            return `
                        <div class="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                            <div class="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                <i data-lucide="package-open" class="w-5 h-5 text-rose-500"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-start justify-between gap-2">
                                    <div>
                                        <p class="font-bold text-gray-900">${r.item_name}</p>
                                        <p class="text-xs text-gray-500 mt-0.5">Qty: ${r.quantity} • Reason: <span class="italic">${r.reason}</span></p>
                                        <div class="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                            <span>${r.restock ? window.t('will_restock', 'Will restock') : window.t('no_restock', 'No restock')}</span>
                                            <span>•</span>
                                            <span>${fmt.dateTime(r.created_at)}</span>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2 flex-shrink-0">
                                        <div class="text-right">
                                            <p class="font-black text-gray-900">${fmt.currency(r.return_amount)}</p>
                                            <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}">
                                                <span class="w-1.5 h-1.5 rounded-full ${style.dot}"></span>
                                                ${r.status}
                                            </span>
                                        </div>
                                        ${r.status === 'pending' ? `
                                        <button onclick="deleteReturn('${r.id}')" class="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                        </button>` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>`;
        }).join('')}
                </div>`}
            </div>
        </div>`;
        lucide.createIcons();
    } catch (err) {
        document.getElementById('mainContent').innerHTML = `<div class="py-20 text-center text-red-500">Failed: ${err.message}</div>`;
    }
};

window.openReturnModal = async function () {
    const [salesRes, invRes] = await Promise.all([
        window.dbSales ? window.dbSales.fetchAll(state.branchId, { pageSize: 20 }).catch(() => ({ items: [] })) : { items: [] },
        window.dbInventory ? window.dbInventory.fetchAll(state.branchId, { pageSize: 500 }).catch(() => ({ items: [] })) : { items: [] }
    ]);
    const recentSales = Array.isArray(salesRes) ? salesRes : (salesRes.items || []);
    const inventory = Array.isArray(invRes) ? invRes : (invRes.items || []);

    window._returnsCatalogMap = {};
    (inventory || []).forEach(i => {
        window._returnsCatalogMap[i.name] = i.item_type || 'product';
    });


    const modalHtml = `
    <div class="p-6">
        <div class="flex items-center justify-between mb-5">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">${window.t('new_product_return_modal', 'New Return / Reversal')}</h3>
            <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">${window.t('return_item_name', 'Item or Service Name')} *</label>
                ${inventory?.length > 0 ? window.renderPremiumSelect({
        id: 'returnItem',
        selectedValue: '',
        searchable: true,
        placeholder: 'Select item or service...',
        onchange: 'window.onReturnItemChange()',
        options: [
            { value: '', label: 'Select item or service...' },
            ...inventory.map(i => ({ 
                value: i.name, 
                label: i.item_type === 'service' ? `${i.name} (Service)` : i.name, 
                icon: i.item_type === 'service' ? 'wrench' : 'package' 
            }))
        ]
    }) : `<input type="text" id="returnItem" class="form-input w-full" placeholder="Enter item name">`}
            </div>
            ${recentSales?.length > 0 ? `
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Link to Sale (optional)</label>
                ${window.renderPremiumSelect({
        id: 'returnSale',
        selectedValue: '',
        searchable: false,
        options: [
            { value: '', label: 'No linked sale', icon: 'minus' },
            ...recentSales.map(s => ({ value: s.id, label: `${fmt.dateTime(s.created_at)} — ${fmt.currency(s.amount)}`, icon: 'receipt' }))
        ]
    })}
            </div>` : ''}
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">${window.t('return_quantity', 'Quantity')} *</label>
                    <input type="number" id="returnQty" class="form-input w-full" value="1" min="1">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">${window.t('refund_amount', 'Refund Amount')} *</label>
                    <input type="number" id="returnAmount" class="form-input w-full" placeholder="0.00" min="0">
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">${window.t('return_reason', 'Return Reason')} *</label>
                ${window.renderPremiumSelect({
        id: 'returnReason',
        selectedValue: 'defective',
        searchable: false,
        options: [
            { value: 'defective', label: 'Defective / Damaged / Unsatisfactory', icon: 'alert-triangle' },
            { value: 'wrong_item', label: 'Wrong Item or Service', icon: 'x-circle' },
            { value: 'customer_changed_mind', label: 'Customer Cancelled', icon: 'rotate-ccw' },
            { value: 'expired', label: 'Expired', icon: 'clock' },
            { value: 'other', label: 'Other', icon: 'more-horizontal' }
        ]
    })}
            </div>
            <div id="returnRestockContainer">
                <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="returnRestock" checked class="w-4 h-4 text-indigo-600 rounded border-gray-300">
                    <span id="returnRestockLabel" class="text-sm text-gray-700 dark:text-gray-300 font-medium">${window.t('return_restock_checkbox', 'Return item to inventory (restock)')}</span>
                </label>
                <p id="returnServiceHint" class="text-xs text-purple-600 dark:text-purple-400 mt-1 hidden font-semibold">Services are intangible and will not be restocked into inventory.</p>
            </div>
        </div>
        <div class="flex gap-3 mt-6">
            <button onclick="closeModal()" class="flex-1 py-2.5 rounded-xl font-medium text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold border-none cursor-pointer">${window.t('btn_cancel', 'Cancel')}</button>
            <button onclick="submitProductReturn()" class="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 text-sm cursor-pointer shadow-md">${window.t('btn_submit', 'Submit Return')}</button>
        </div>
    </div>`;
    openModal(modalHtml);
};

window.onReturnItemChange = function () {
    const itemName = document.getElementById('returnItem')?.value?.trim();
    const itemType = window._returnsCatalogMap?.[itemName] || 'product';
    const restockCheck = document.getElementById('returnRestock');
    const restockHint = document.getElementById('returnServiceHint');

    if (itemType === 'service') {
        if (restockCheck) {
            restockCheck.checked = false;
            restockCheck.disabled = true;
        }
        if (restockHint) restockHint.classList.remove('hidden');
    } else {
        if (restockCheck) {
            restockCheck.disabled = false;
            restockCheck.checked = true;
        }
        if (restockHint) restockHint.classList.add('hidden');
    }
};

window.submitProductReturn = async function () {
    const itemName = document.getElementById('returnItem')?.value?.trim();
    const saleId = document.getElementById('returnSale')?.value || null;
    const qty = parseInt(document.getElementById('returnQty')?.value || '1');
    const returnAmount = parseFloat(document.getElementById('returnAmount')?.value || '0');
    const reason = document.getElementById('returnReason')?.value;
    const itemType = window._returnsCatalogMap?.[itemName] || 'product';
    const restock = itemType === 'service' ? false : (document.getElementById('returnRestock')?.checked ?? true);

    if (!itemName || !returnAmount) { showToast('Item name and refund amount are required', 'error'); return; }

    try {
        const payload = {
            branch_id: state.branchId,
            sale_id: saleId || null,
            item_name: itemName,
            quantity: qty,
            return_amount: returnAmount,
            reason,
            restock,
            item_type: itemType,
            status: 'pending'
        };
        if (window.dbReturns && typeof window.dbReturns.create === 'function') {
            await window.dbReturns.create(payload);
        }
        showToast('Return submitted for approval!', 'success');
        closeModal();
        renderReturnsModule();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

window.deleteReturn = async function (id) {
    const ok = await confirmModal('Cancel Return', 'Cancel this return request?', 'Cancel Return', 'Keep');
    if (!ok) return;
    if (window.dbReturns && typeof window.dbReturns.delete === 'function') {
        await window.dbReturns.delete(id);
    }
    showToast('Return cancelled', 'info');
    renderReturnsModule();
};

