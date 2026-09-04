import { state } from '../state.js';
import { dbBranches, dbPromotions } from '../db.js';
import { fmt, renderPremiumLoader, showToast, confirmModal, renderModuleOfflineState } from '../utils.js';

export async function renderPromotionsModule() {
    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return;

    const container = document.getElementById('mainContent');
    if (!container) return;

    container.classList.remove('overflow-hidden', '!p-0');
    container.innerHTML = renderPremiumLoader('Loading promotions...');
    if (window.lucide) window.lucide.createIcons();

    try {
        const [branches, promos] = await Promise.all([
            dbBranches.fetchAll(ownerId),
            dbPromotions.fetchAll(ownerId)
        ]);
        const today = new Date().toISOString().split('T')[0];


        const active = (promos || []).filter(p => p.is_active && (!p.expires_at || p.expires_at >= today));
        const inactive = (promos || []).filter(p => !p.is_active || (p.expires_at && p.expires_at < today));

        const activeLabel = window.t('active_lc', 'active campaigns');
        const createPromoLabel = window.t('create_promotion', 'Create Promotion');
        const promosTitle = window.t('nav_promotions', 'Promotions & Discounts');

        container.innerHTML = `
        <div class="space-y-5 slide-in max-w-7xl mx-auto pb-8">
            <!-- Header Section -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold shrink-0 shadow-xs">
                        <i data-lucide="tag" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h2 class="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">${promosTitle}</h2>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-pink-50 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 border border-pink-100 dark:border-pink-800/50">
                                ${active.length} ${activeLabel}
                            </span>
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage customer discounts, percentage off deals, and seasonal pricing rules</p>
                    </div>
                </div>
                <button onclick="renderAddPromotionView()" class="w-full sm:w-auto px-4 py-2.5 bg-pink-600 hover:bg-pink-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0">
                    <i data-lucide="plus-circle" class="w-4 h-4"></i>
                    <span>${createPromoLabel}</span>
                </button>
            </div>

            <!-- Promotions Grid -->
            ${(promos || []).length === 0 ? `
            <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs py-20 text-center">
                <div class="w-14 h-14 rounded-2xl bg-pink-50 dark:bg-pink-950/40 text-pink-500 flex items-center justify-center mx-auto mb-3">
                    <i data-lucide="tag" class="w-7 h-7"></i>
                </div>
                <h3 class="text-base font-bold text-gray-900 dark:text-white">No active promotions</h3>
                <p class="text-xs text-gray-400 mt-1 max-w-sm mx-auto">Create percentage discounts or fixed cash-off vouchers for your branches</p>
            </div>` : `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${[...active, ...inactive].map(p => {
                    const expired = p.expires_at && p.expires_at < today;
                    const statusLabel = expired ? window.t('expired', 'Expired') : (p.is_active ? window.t('active', 'Active') : window.t('paused', 'Paused'));
                    const statusClass = expired
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                        : (p.is_active
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800');

                    const isPercentage = p.discount_type === 'percentage';
                    const valueDisplay = isPercentage ? `${p.discount_value}% OFF` : `${fmt.currency(p.discount_value)} OFF`;

                    return `
                    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between relative ${expired ? 'opacity-60' : ''}">
                        <div>
                            <div class="flex items-start justify-between gap-3 mb-3">
                                <div class="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center font-black text-sm shrink-0">
                                    ${isPercentage ? '%' : '$'}
                                </div>
                                <div class="flex items-center gap-1.5 shrink-0">
                                    ${!expired ? `
                                    <button onclick="togglePromotion('${p.id}', ${!p.is_active})"
                                        class="p-1.5 ${p.is_active ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'} rounded-lg transition-colors"
                                        title="${p.is_active ? 'Pause Campaign' : 'Activate Campaign'}">
                                        <i data-lucide="${p.is_active ? 'pause' : 'play'}" class="w-3.5 h-3.5"></i>
                                    </button>` : ''}
                                    <button onclick="deletePromotion('${p.id}')" class="p-1.5 bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100 rounded-lg transition-colors" title="Delete">
                                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                    </button>
                                </div>
                            </div>

                            <h4 class="font-extrabold text-sm text-gray-900 dark:text-white leading-snug">${p.name}</h4>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">${p.description || 'Special promotion discount campaign'}</p>
                        </div>

                        <div class="mt-4 pt-3.5 border-t border-gray-100 dark:border-gray-800/80 space-y-2">
                            <div class="flex items-center justify-between">
                                <span class="px-2.5 py-0.5 rounded-lg text-xs font-black bg-pink-50 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300">
                                    ${valueDisplay}
                                </span>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClass}">
                                    ${statusLabel}
                                </span>
                            </div>
                            <div class="flex items-center justify-between text-[11px] text-gray-400">
                                <span class="flex items-center gap-1">
                                    <i data-lucide="map-pin" class="w-3 h-3 text-gray-400"></i> ${p.branches?.name || 'All Branches'}
                                </span>
                                <span>
                                    ${p.expires_at ? `Exp: ${p.expires_at}` : 'No Expiry'}
                                </span>
                            </div>
                        </div>
                    </div>`;
                }).join('')}
            </div>`}
        </div>`;

        if (window.lucide) window.lucide.createIcons();

    } catch (err) {
        console.error('[OwnerPromotions] Error loading promotions:', err);
        if (container) {
            container.innerHTML = renderModuleOfflineState({
                viewId: 'promotions',
                title: 'Promotions & Discounts',
                entityName: 'Promotions & Discount Data',
                retryAction: 'window.renderPromotionsModule()'
            });
            if (window.lucide) window.lucide.createIcons();
        }
    }
}

// ── STANDARD MODAL/PAGE VIEW CONTAINER MATCHING ASSIGN NEW TASK ────────────────
export async function renderAddPromotionView() {
    const container = document.getElementById('mainContent');
    if (!container) return;

    container.classList.add('overflow-hidden', '!p-0');

    const branches = state.branches || (await dbBranches.fetchAll(state.ownerId)) || [];

    container.innerHTML = `
    <div class="flex flex-col h-full bg-slate-50/50 dark:bg-gray-900 overflow-hidden">
        <!-- Top Nav Header -->
        <div class="modal-top-nav flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none">
            <button type="button" onclick="renderPromotionsModule()" class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200 dark:border-gray-700">
                <i data-lucide="chevron-left" class="w-4 h-4"></i>
                <span>${window.t('btn_close', 'Close')}</span>
            </button>
            <div class="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-base shrink-0 border border-gray-200/80 dark:border-gray-700">
                <i data-lucide="tag" class="w-4 h-4"></i>
            </div>
            <div>
                <h3 class="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">${window.t('create_promotion', 'Create Promotion')}</h3>
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Set discount rules, minimum order values, and branch scope</p>
            </div>
        </div>

        <!-- Form Body Container -->
        <form onsubmit="event.preventDefault(); submitPromotion();" class="flex flex-col flex-1 overflow-hidden">
            <div class="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-4 scroller-custom">
                <div class="bg-white dark:bg-gray-800/90 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
                    <div>
                        <label for="promoBranch" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('location_label', 'Branch Scope')}</label>
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'promoBranch',
                            selectedValue: '',
                            searchable: branches.length > 4,
                            options: [
                                { value: '', label: 'All Branches', icon: 'layers' },
                                ...branches.map(b => ({ value: b.id, label: b.name, icon: 'map-pin' }))
                            ]
                        }) : ''}
                    </div>

                    <div>
                        <label for="promoName" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('promotion_name', 'Promotion Title')} *</label>
                        <input type="text" id="promoName" required class="form-input w-full" placeholder="e.g. Weekend Flash Discount 15%">
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label for="promoType" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('discount_type', 'Discount Type')} *</label>
                            ${window.renderPremiumSelect ? window.renderPremiumSelect({
                                id: 'promoType',
                                selectedValue: 'percentage',
                                searchable: false,
                                options: [
                                    { value: 'percentage', label: 'Percentage (%)', icon: 'percent' },
                                    { value: 'fixed', label: 'Fixed Amount (TZS)', icon: 'tag' }
                                ]
                            }) : ''}
                        </div>
                        <div>
                            <label for="promoValue" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('discount_value', 'Discount Value')} *</label>
                            <input type="text" inputmode="decimal" id="promoValue" required class="form-input w-full font-black text-pink-600 dark:text-pink-400" placeholder="e.g. 15">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label for="promoMinAmount" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('min_purchase', 'Min. Purchase (TZS)')}</label>
                            <input type="text" inputmode="decimal" id="promoMinAmount" class="form-input w-full" placeholder="0.00">
                        </div>
                        <div>
                            <label for="promoExpiry" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('expiry_date', 'Expiry Date (Optional)')}</label>
                            ${window.renderPremiumDatePicker ? window.renderPremiumDatePicker({
                                id: 'promoExpiry',
                                selectedValue: '',
                                placeholder: 'Select Expiry Date',
                                classes: 'w-full'
                            }) : '<input type="date" id="promoExpiry" class="form-input w-full">'}
                        </div>
                    </div>

                    <div>
                        <label for="promoDescription" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('description', 'Description & Terms (Optional)')}</label>
                        <textarea id="promoDescription" rows="3" class="form-input w-full" placeholder="Add promotion details & terms..."></textarea>
                    </div>
                </div>
            </div>

            <!-- Bottom Action Nav Footer -->
            <div class="modal-bottom-nav flex-none p-3.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                <button type="button" onclick="renderPromotionsModule()" class="px-6 py-2 rounded-full font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all cursor-pointer">
                    ${window.t('btn_cancel', 'Cancel')}
                </button>
                <button type="submit" class="px-6 py-2 bg-[#2c3e50] hover:bg-[#1a252f] text-white rounded-full font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2">
                    <span>${window.t('create_promotion', 'Create Promotion')}</span>
                </button>
            </div>
        </form>
    </div>`;

    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
        if (window.hydrateFormDraft) window.hydrateFormDraft('ownerPromotionDraft', area);
        if (window.attachFormDraftAutoSave) window.attachFormDraftAutoSave('ownerPromotionDraft', area);
    }, 50);
}

window.renderPromotionsModule = renderPromotionsModule;
window.renderAddPromotionView = renderAddPromotionView;
window.openPromotionModal = renderAddPromotionView;

window.submitPromotion = async function () {
    const name = document.getElementById('promoName')?.value?.trim();
    const discountType = document.getElementById('promoType')?.value || 'percentage';
    const discountValue = window.fmt?.parseNumber ? window.fmt.parseNumber(document.getElementById('promoValue')?.value || '0') : parseFloat(document.getElementById('promoValue')?.value || '0');
    const branchId = document.getElementById('promoBranch')?.value || null;
    const minAmount = window.fmt?.parseNumber ? window.fmt.parseNumber(document.getElementById('promoMinAmount')?.value || '0') : parseFloat(document.getElementById('promoMinAmount')?.value || '0');
    const expiresAt = document.getElementById('promoExpiry')?.value || null;
    const description = document.getElementById('promoDescription')?.value?.trim();

    if (!name || !discountValue) {
        showToast('Promotion name and discount value are required', 'error');
        return;
    }

    try {
        await dbPromotions.create({
            owner_id: state.ownerId,
            branch_id: branchId || null,
            name,
            discount_type: discountType,
            discount_value: discountValue,
            min_amount: minAmount || null,
            expires_at: expiresAt || null,
            description,
            is_active: true
        });

        if (window.clearFormDraft) window.clearFormDraft('ownerPromotionDraft');
        showToast('Promotion campaign successfully created!', 'success');
        renderPromotionsModule();
    } catch (err) {
        showToast('Failed to create promotion: ' + err.message, 'error');
    }
};

window.togglePromotion = async function (id, newState) {
    try {
        await dbPromotions.toggleActive(id, newState);
        showToast(newState ? 'Promotion activated!' : 'Promotion paused', 'success');
        renderPromotionsModule();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

window.deletePromotion = async function (id) {
    const ok = await confirmModal('Delete Promotion', 'Are you sure you want to delete this promotion campaign?', 'Delete', 'Cancel');
    if (!ok) return;

    try {
        await dbPromotions.delete(id);
        showToast('Promotion deleted', 'info');
        renderPromotionsModule();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

