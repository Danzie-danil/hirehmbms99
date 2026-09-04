
export async function renderLoyaltyModule() {
    const container = document.getElementById('mainContent');
    container.innerHTML = renderPremiumLoader('Loading loyalty program...');
    lucide.createIcons();

    try {
        const [customers, transactions] = await Promise.all([
            window.dbLoyalty ? window.dbLoyalty.fetchCustomers(state.branchId).catch(() => []) : [],
            window.dbLoyalty ? window.dbLoyalty.fetchTransactions(state.branchId, 30).catch(() => []) : []
        ]);


        const tierColors = {
            gold: { bg: 'bg-amber-100 border-amber-200', badge: 'bg-amber-500 text-white', icon: 'award' },
            silver: { bg: 'bg-gray-100 border-gray-200', badge: 'bg-gray-400 text-white', icon: 'shield' },
            bronze: { bg: 'bg-orange-50 border-orange-200', badge: 'bg-orange-400 text-white', icon: 'star' }
        };

        const savedTab = state._loyaltyTab || 'customers';

        const totalPoints = (customers || []).reduce((s, c) => s + (c.loyalty_points || 0), 0);
        const goldCount = (customers || []).filter(c => c.loyalty_tier === 'gold').length;
        const silverCount = (customers || []).filter(c => c.loyalty_tier === 'silver').length;

        container.innerHTML = `
        <div class="space-y-4 slide-in">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="inline-flex items-center gap-2 bg-white border border-gray-200 shadow-sm rounded-2xl p-1 pr-5">
                    <div class="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><i data-lucide="award" class="w-3.5 h-3.5"></i> ${window.t('customer_loyalty_title', 'Customer Loyalty')}</div>
                </div>
                <button onclick="openLoyaltyModal()" class="btn-primary gap-2 text-sm px-4 py-2 rounded-xl">
                    <i data-lucide="plus" class="w-4 h-4"></i> ${window.t('btn_award_redeem', 'Award / Redeem Points')}
                </button>
            </div>

            <div class="grid grid-cols-3 gap-3">
                <div class="bg-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm stat-card">
                    <p class="text-xs text-gray-500 uppercase tracking-tight font-bold">${window.t('total_points', 'Total Points')}</p>
                    <p class="text-2xl font-black text-indigo-600 mt-1">${totalPoints.toLocaleString()}</p>
                </div>
                <div class="bg-amber-50 px-4 py-3 rounded-2xl border border-amber-100 shadow-sm stat-card">
                    <p class="text-xs text-amber-600 uppercase tracking-tight font-bold">${window.t('gold_members', 'Gold Members')}</p>
                    <p class="text-2xl font-black text-amber-700 mt-1">${goldCount}</p>
                </div>
                <div class="bg-gray-50 px-4 py-3 rounded-2xl border border-gray-200 shadow-sm stat-card">
                    <p class="text-xs text-gray-500 uppercase tracking-tight font-bold">${window.t('silver_members', 'Silver Members')}</p>
                    <p class="text-2xl font-black text-gray-600 mt-1">${silverCount}</p>
                </div>
            </div>

            <!-- Tabs -->
            <div class="flex bg-gray-100 rounded-2xl p-1 gap-1 w-fit">
                <button onclick="state._loyaltyTab='customers'; renderLoyaltyModule()"
                    class="px-4 py-2 rounded-xl text-sm font-bold transition-all ${savedTab === 'customers' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}">
                    ${window.t('tab_customers', 'Customers')}
                </button>
                <button onclick="state._loyaltyTab='history'; renderLoyaltyModule()"
                    class="px-4 py-2 rounded-xl text-sm font-bold transition-all ${savedTab === 'history' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}">
                    ${window.t('tab_history', 'History')}
                </button>
            </div>

            ${savedTab === 'customers' ? `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                ${(customers || []).length === 0 ? `
                <div class="py-16 text-center text-gray-400">
                    <i data-lucide="star" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                    <p class="text-sm font-medium">No customers yet</p>
                    <p class="text-xs mt-1">Add customers from the Customers module to start tracking loyalty</p>
                </div>` : `
                <div class="divide-y divide-gray-50">
                    ${(customers || []).map(c => {
            const tier = c.loyalty_tier || 'bronze';
            const style = tierColors[tier] || tierColors.bronze;
            const nextTierPoints = tier === 'bronze' ? 500 : tier === 'silver' ? 2000 : null;
            const progress = nextTierPoints ? Math.min(Math.round((c.loyalty_points || 0) / nextTierPoints * 100), 100) : 100;
            return `
                        <div class="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                            <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span class="font-black text-sm text-indigo-700">${c.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-0.5">
                                    <p class="font-bold text-gray-900">${c.name}</p>
                                    <span class="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${style.badge}">
                                        <i data-lucide="${style.icon}" class="w-3 h-3"></i> ${tier.toUpperCase()}
                                    </span>
                                </div>
                                ${nextTierPoints ? `
                                <div class="flex items-center gap-2 mt-1">
                                    <div class="flex-1 bg-gray-100 rounded-full h-1.5">
                                        <div class="bg-amber-400 h-1.5 rounded-full" style="width:${progress}%"></div>
                                    </div>
                                    <span class="text-[10px] text-gray-400 font-medium whitespace-nowrap">${(c.loyalty_points || 0).toLocaleString()}/${nextTierPoints}</span>
                                </div>` : `<p class="inline-flex items-center gap-1 text-xs text-amber-500 font-bold"><i data-lucide="crown" class="w-3.5 h-3.5"></i> ${window.t('top_tier_member', 'Top Tier Member')}</p>`}
                            </div>
                            <div class="text-right">
                                <p class="text-xl font-black text-gray-900">${(c.loyalty_points || 0).toLocaleString()}</p>
                                <p class="text-[10px] text-gray-400 font-bold uppercase">${window.t('points_short', 'PTS')}</p>
                            </div>
                        </div>`;
        }).join('')}
                </div>`}
            </div>` : `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                ${(transactions || []).length === 0 ? `
                <div class="py-16 text-center text-gray-400">
                    <i data-lucide="history" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                    <p class="text-sm font-medium">No transactions yet</p>
                </div>` : `
                <div class="divide-y divide-gray-50">
                    ${(transactions || []).map(t => `
                    <div class="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'earn' ? 'bg-emerald-100' : 'bg-purple-100'}">
                            <i data-lucide="${t.type === 'earn' ? 'plus' : 'minus'}" class="w-4 h-4 ${t.type === 'earn' ? 'text-emerald-600' : 'text-purple-600'}"></i>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-semibold text-gray-900">${t.customers?.name || 'Customer'}</p>
                            <p class="text-xs text-gray-400">${t.description || (t.type === 'earn' ? 'Points earned' : 'Points redeemed')} • ${fmt.dateTime(t.created_at)}</p>
                        </div>
                        <span class="font-black text-sm ${t.type === 'earn' ? 'text-emerald-600' : 'text-purple-600'}">${t.type === 'earn' ? '+' : '-'}${t.points.toLocaleString()} pts</span>
                    </div>`).join('')}
                </div>`}
            </div>`}
        </div>`;
        lucide.createIcons();
    } catch (err) {
        document.getElementById('mainContent').innerHTML = `<div class="py-20 text-center text-red-500">Failed: ${err.message}</div>`;
    }
};

window.openLoyaltyModal = async function () {
    const custRes = await (window.dbCustomers ? window.dbCustomers.fetchAllList(state.branchId).catch(() => []) : []);
    const customers = Array.isArray(custRes) ? custRes : (custRes.items || []);
    if (!customers?.length) { showToast('No customers found. Add customers first.', 'info'); return; }

    const modalHtml = `
    <div class="p-6">
        <div class="flex items-center justify-between mb-5">
            <h3 class="text-xl font-bold text-gray-900">${window.t('modal_award_redeem', 'Award / Redeem Points')}</h3>
            <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">${window.t('customer_name', 'Customer')} *</label>
                ${window.renderPremiumSelect({
        id: 'loyaltyCustomer',
        selectedValue: customers[0]?.id || '',
        searchable: customers.length > 5,
        options: customers.map(c => ({ value: c.id, label: `${c.name} (${c.loyalty_points || 0} pts)`, icon: 'user' }))
    })}
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">${window.t('transaction_type', 'Transaction Type')} *</label>
                ${window.renderPremiumSelect({
        id: 'loyaltyType',
        selectedValue: 'earn',
        searchable: false,
        options: [
            { value: 'earn', label: window.t('award_points_opt', 'Award Points'), icon: 'star' },
            { value: 'redeem', label: window.t('redeem_points_opt', 'Redeem Points'), icon: 'gift' }
        ]
    })}
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">${window.t('total_points', 'Points')} *</label>
                <input type="number" id="loyaltyPoints" class="form-input w-full" placeholder="e.g. 100" min="1">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">${window.t('description_notes', 'Description')}</label>
                <input type="text" id="loyaltyDesc" class="form-input w-full" placeholder="e.g. Birthday bonus, Purchase reward...">
            </div>
        </div>
        <div class="flex gap-3 mt-6">
            <button onclick="closeModal()" class="flex-1 py-2.5 rounded-xl font-medium hover: text-sm bg-red-600 text-white hover:bg-red-700 shadow-sm font-bold border-none">${window.t('btn_cancel', 'Cancel')}</button>
            <button onclick="submitLoyaltyTransaction()" class="flex-1 py-2.5 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 text-sm">${window.t('btn_submit', 'Submit')}</button>
        </div>
    </div>`;
    openModal(modalHtml);
};

window.submitLoyaltyTransaction = async function () {
    const customerId = document.getElementById('loyaltyCustomer')?.value;
    const type = document.getElementById('loyaltyType')?.value;
    const points = parseInt(document.getElementById('loyaltyPoints')?.value || '0');
    const description = document.getElementById('loyaltyDesc')?.value?.trim();

    if (!customerId || !points || points < 1) { showToast('Select a customer and enter valid points', 'error'); return; }

    try {
        if (window.dbLoyalty && typeof window.dbLoyalty.recordTransaction === 'function') {
            await window.dbLoyalty.recordTransaction({
                branchId: state.branchId,
                customerId,
                points,
                type,
                reason: description
            });
        }

        const cust = await (window.dbCustomers ? window.dbCustomers.fetchOne(customerId).catch(() => null) : null);
        const current = cust?.loyalty_points || 0;
        const newPoints = type === 'earn' ? current + points : Math.max(0, current - points);
        const newTier = newPoints >= 2000 ? 'gold' : newPoints >= 500 ? 'silver' : 'bronze';

        if (window.dbCustomers && typeof window.dbCustomers.update === 'function') {
            await window.dbCustomers.update(customerId, { loyalty_points: newPoints, loyalty_tier: newTier });
        }

        showToast(`${type === 'earn' ? 'Awarded' : 'Redeemed'} ${points} points!`, 'success');
        closeModal();
        renderLoyaltyModule();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

