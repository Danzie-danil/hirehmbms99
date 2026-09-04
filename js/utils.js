import { state } from './state.js';
import { dbSales, dbExpenses, dbInventory, dbNotes, dbCustomers, dbLoans, dbSuppliers, dbStaff, dbPurchaseOrders, dbQuotations, dbTasks, dbTaskComments, dbBranches } from './db.js';
import { saveFormDraft, getFormDraft, clearFormDraft } from './data/db.js';

export function renderPremiumTimeSelect({
    id,
    selectedValue = '',
    interval = 15,
    classes = '',
    placeholder = 'Select time',
    startHour = 6,
    endHour = 23
} = {}) {
    const options = [];
    for (let h = startHour; h <= endHour; h++) {
        for (let m = 0; m < 60; m += interval) {
            const hh = String(h).padStart(2, '0');
            const mm = String(m).padStart(2, '0');
            const value = `${hh}:${mm}`;
            const ampm = h < 12 ? 'AM' : 'PM';
            const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
            const label = `${h12}:${mm} ${ampm}`;
            options.push({ value, label });
        }
    }
    return window.renderPremiumSelect({
        id,
        selectedValue,
        placeholder,
        searchable: true,
        classes: classes || 'w-36 text-sm',
        options
    });
}

export function triggerIconSpin(el) {
    if (!el) return;
    const target = el.tagName === 'svg' || el.hasAttribute('data-lucide') ? el : el.querySelector('svg, i[data-lucide]');
    if (target) {
        target.classList.remove('icon-spin-once');
        void target.offsetWidth;
        target.classList.add('icon-spin-once');
        setTimeout(() => target.classList.remove('icon-spin-once'), 650);
    }
}
window.triggerIconSpin = triggerIconSpin;

export function branchCanDo(action) {

    if (!state || state.role !== 'branch') return false;

    const branch = state.branchProfile;
    if (!branch) return false;

    const prefs = branch.preferences || {};
    return prefs[action] === true;
};

export function filterList(listId, query) {
    const list = document.getElementById(listId);
    if (!list) return;
    const q = query.trim().toLowerCase();
    list.querySelectorAll('[data-search]').forEach(item => {
        const text = item.getAttribute('data-search') || '';
        item.style.display = q === '' || text.includes(q) ? '' : 'none';
    });
};

function _utilsInitIcons() {
    setTimeout(() => { if (window.lucide) window.lucide.createIcons(); }, 100);
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _utilsInitIcons);
} else {
    _utilsInitIcons();
}

let _lastSoundTime = {};
export function playSound(name) {
    if (localStorage.getItem('bms_sound_pref') === 'false') return;

    const now = Date.now();
    if (_lastSoundTime[name] && now - _lastSoundTime[name] < 500) {
        return;
    }
    _lastSoundTime[name] = now;

    const audio = new window.Audio(`/audio/${name}.mp3`);
    audio.volume = 0.5;
    audio.play().catch(e => {});
};

export function stripEmojis(str) {
    if (!str) return '';
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2B50}\u{2705}\u{274C}\u{26A0}\u{2728}\u{2714}\u{2716}\u{2702}-\u{27B0}\u{FE00}-\u{FE0F}]/gu;
    return String(str).replace(emojiRegex, '').replace(/\s{2,}/g, ' ').trim();
}
window.stripEmojis = stripEmojis;

/**
 * Get current local calendar date in YYYY-MM-DD format (timezone-aware).
 */
export function getLocalTodayDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
window.getLocalTodayDateString = getLocalTodayDateString;

/**
 * Get current local midnight timestamp as an ISO string for DB queries.
 */
export function getLocalTodayStartIso() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
}
window.getLocalTodayStartIso = getLocalTodayStartIso;

/**
 * Returns true if an item record or date string falls strictly on TODAY's local calendar date.
 */
export function isCreatedToday(itemOrTimestamp) {
    if (!itemOrTimestamp) return false;
    const raw = typeof itemOrTimestamp === 'string' || typeof itemOrTimestamp === 'number' || itemOrTimestamp instanceof Date
        ? itemOrTimestamp
        : (itemOrTimestamp.created_at || itemOrTimestamp.date || itemOrTimestamp.timestamp);
    if (!raw) return false;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return false;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}` === getLocalTodayDateString();
}
window.isCreatedToday = isCreatedToday;

export function showToast(message, type = 'info', customDuration = null) {
    if (!message) return;
    const textStr = stripEmojis(message);
    if (!textStr) return;

    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: 'check-circle',
        error: 'x-circle',
        info: 'info',
        warning: 'alert-triangle'
    };

    const iconName = icons[type] || 'info';

    // Dynamic duration based on text length: min 4.5s, max 14s (longer for lengthy notices)
    const duration = customDuration || Math.max(4500, Math.min(14000, textStr.length * 65));

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    toast.innerHTML = `
        <div class="toast-icon-badge shrink-0 mt-0.5">
            <i data-lucide="${iconName}" style="width:18px;height:18px;flex-shrink:0"></i>
        </div>
        <div class="toast-content-scroll flex-1 min-w-0">
            ${textStr}
        </div>
        <button type="button" aria-label="Dismiss notification" class="toast-close-btn shrink-0 p-1 -mr-1 -mt-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer" onclick="const t = this.closest('.toast'); if (t) { t.style.opacity = '0'; t.style.transform = 'translateY(20px) scale(0.95)'; setTimeout(() => t.remove(), 250); }">
            <i data-lucide="x" style="width:14px;height:14px"></i>
        </button>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    if (type === 'error') playSound('error');
    else playSound('pop-alert');

    let dismissTimer = setTimeout(() => {
        if (!toast.parentElement) return;
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px) scale(0.95)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);

    toast.addEventListener('mouseenter', () => {
        clearTimeout(dismissTimer);
    });

    toast.addEventListener('mouseleave', () => {
        dismissTimer = setTimeout(() => {
            if (!toast.parentElement) return;
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px) scale(0.95)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    });
};

export async function openEditModal(type, id) {
    if (!id || id === 'undefined') {

        return;
    }
    try {
        let data = null;

        switch (type) {
            case 'editSale': data = await dbSales.fetchOne(id); break;
            case 'editExpense': data = await dbExpenses.fetchOne(id); break;
            case 'editInventoryItem': data = await dbInventory.fetchOne(id); break;
            case 'editNote': data = await dbNotes.fetchOne(id); break;
            case 'editCustomer': data = await dbCustomers.fetchOne(id); break;
            case 'editLoan': data = await dbLoans.fetchOne(id); break;
            case 'editSupplier': data = await dbSuppliers.fetchOne(id); break;
            case 'editStaff': data = await dbStaff.fetchOne(id); break;
            case 'viewPO': data = await dbPurchaseOrders.fetchWithItems(id); break;
            case 'viewQuotation': data = await dbQuotations.fetchWithItems(id); break;
        }
        if (data) openModal(type, data);
    } catch (err) {
        showToast('Failed to load data for editing: ' + err.message, 'error');
    }
};

export async function openDetailsModal(type, id) {
    if (!id || id === 'undefined') {
        return;
    }
    const expectedModalType = type + 'Details';
    const isModalRendered = document.getElementById('mainContent')?.querySelector('.modal-top-nav, [data-modal-type]');
    if (state._currentModalType === expectedModalType && state._currentModalData && state._currentModalData.id === id && isModalRendered) {
        return;
    }
    if (state._loadingDetailsId === id) {
        return;
    }
    state._loadingDetailsId = id;
    try {
        let data = null;

        switch (type) {
            case 'sale':
                data = await dbSales.fetchOne(id);

                if (data && data.product_id) {
                    try {
                        const product = await dbInventory.fetchOne(data.product_id);
                        if (product) {
                            const qty = parseInt(data.quantity || (data.items?.match(/^(\d+)x/)?.[1] || 1));
                            data.cost_price = product.cost_price || 0;
                            data.profit = parseFloat(data.amount) - (data.cost_price * qty);
                        }
                    } catch (e) {  }
                }
                break;
            case 'expense': data = await dbExpenses.fetchOne(id); break;
            case 'inventory':
                if (state.role === 'branch' && typeof window.openBranchProductDetailsView === 'function') {
                    await window.openBranchProductDetailsView(id);
                    return;
                }
                data = await dbInventory.fetchOne(id);
                break;
            case 'note': data = await dbNotes.fetchOne(id); break;
            case 'customer': data = await dbCustomers.fetchOne(id); break;
            case 'loan': data = await dbLoans.fetchOne(id); break;
            case 'task': {
                data = await dbTasks.fetchOne(id);
                if (data) {
                    try {
                        data._comments = await dbTaskComments.fetchAll(id);
                    } catch (e) {
                        data._comments = [];
                    }
                }
                break;
            }
            case 'branch': {
                data = (state.branches && state.branches.find(b => b.id === id)) || (await dbBranches.fetchOne(id));
                if (data) {
                    try {
                        const [invRes, salesRes, expRes] = await Promise.all([
                            dbInventory.fetchAll(id, { pageSize: 1000 }).catch(() => ({ items: [] })),
                            dbSales.fetchAll(id, { pageSize: 1000 }).catch(() => ({ items: [] })),
                            dbExpenses.fetchAll(id, { pageSize: 1000 }).catch(() => ({ items: [] }))
                        ]);
                        data._inventory = invRes?.items || [];
                        data._sales = salesRes?.items || [];
                        data._expenses = expRes?.items || [];
                    } catch (fetchErr) {
                        console.warn('[BranchDetails] Error fetching branch metrics:', fetchErr);
                        data._inventory = [];
                        data._sales = [];
                        data._expenses = [];
                    }
                }
                break;
            }
        }
        if (data) {
            try {
                sessionStorage.setItem('bms_active_details_modal', JSON.stringify({ type, id }));
            } catch (e) {}
            openModal(type + 'Details', data);
        }
    } catch (err) {
        showToast('Failed to load details: ' + err.message, 'error');
    } finally {
        state._loadingDetailsId = null;
    }
};

export async function restoreActiveDetailsModal() {
    if (state._isRestoringModal) return false;
    try {
        // 1. Check if there is an active stock operations modal to restore
        const stockOpsRaw = sessionStorage.getItem('bms_active_stock_ops');
        if (stockOpsRaw) {
            try {
                const sData = JSON.parse(stockOpsRaw);
                if (sData && sData.centralItemId) {
                    state._isRestoringModal = true;
                    // If preselectBranchId is set, restore parent branch details in the background
                    if (sData.preselectBranchId) {
                        try {
                            sessionStorage.setItem('bms_active_details_modal', JSON.stringify({ type: 'branch', id: sData.preselectBranchId }));
                            await openDetailsModal('branch', sData.preselectBranchId);
                        } catch (bErr) {
                            console.warn('[restoreActiveDetailsModal] Failed to restore parent branch details:', bErr);
                        }
                    }
                    if (typeof window.openDispatchModal !== 'function') {
                        try {
                            await import('./owner/central_inventory.js');
                        } catch (e) {}
                    }
                    if (typeof window.openDispatchModal === 'function') {
                        await window.openDispatchModal(sData.centralItemId, sData.itemName, sData.currentStock, sData.initialTab || 'dispatch', sData.preselectBranchId);
                    }
                    state._isRestoringModal = false;
                    return true;
                }
            } catch (sErr) {
                console.warn('[restoreActiveDetailsModal] Error restoring stock ops:', sErr);
            }
        }

        // 2. Check if there is an active details modal to restore (e.g. branchDetails)
        const raw = sessionStorage.getItem('bms_active_details_modal');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.type && parsed.id) {
                const expectedModalType = parsed.type + 'Details';
                if (state._currentModalType === expectedModalType && state._currentModalData && state._currentModalData.id === parsed.id) {
                    return true;
                }
                state._isRestoringModal = true;
                await openDetailsModal(parsed.type, parsed.id);
                state._isRestoringModal = false;
                return true;
            }
        }

        // 3. Check if there is an active form/action modal to restore (e.g. openCentralItemModal, addService, addStock, addSale, addExpense, etc.)
        const activeModalRaw = sessionStorage.getItem('bms_active_modal');
        if (activeModalRaw) {
            try {
                const mData = JSON.parse(activeModalRaw);
                if (mData && mData.type) {
                    if (state._currentModalType === mData.type && document.getElementById('mainContent')?.querySelector('form')) {
                        return true;
                    }
                    state._isRestoringModal = true;
                    if (mData.type === 'openCentralItemModal' || mData.type === 'addService' || mData.type === 'addStock') {
                        if (typeof window.openCentralItemModal !== 'function') {
                            try {
                                await import('./owner/central_inventory.js');
                            } catch (e) {}
                        }
                        if (typeof window.openCentralItemModal === 'function') {
                            const preselect = mData.data?.preselectType || (mData.type === 'addService' ? 'service' : null);
                            await window.openCentralItemModal(preselect);
                        }
                    } else if (mData.type === 'addSale' && typeof window.openAddSaleModal === 'function') {
                        await window.openAddSaleModal();
                    } else if (typeof window.openModal === 'function') {
                        window.openModal(mData.type, mData.data);
                    }
                    state._isRestoringModal = false;
                    return true;
                }
            } catch (mErr) {
                console.warn('[restoreActiveDetailsModal] Error restoring active modal:', mErr);
            }
        }
    } catch (e) {
        state._isRestoringModal = false;
    } finally {
        document.querySelectorAll('.loader-spin').forEach(el => el.remove());
    }
    return false;
}
window.restoreActiveDetailsModal = restoreActiveDetailsModal;

export function confirmModal(title, message, confirmText = null, cancelText = null, confirmClass = 'bg-red-600 hover:bg-red-700', requireText = null) {
    const finalConfirmText = confirmText || window.t('confirm', 'Confirm');
    const finalCancelText = cancelText || window.t('cancel', 'Cancel');
    return new Promise((resolve) => {
        const modal = document.getElementById('modalOverlay');
        const content = document.getElementById('modalContent');

        if (content) {
            content.style.height = 'auto';
            content.style.maxHeight = '90vh';
        }

        const inputHtml = requireText ? `
            <div class="mt-3 mb-2">
                <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Type <strong>${requireText}</strong> to confirm</label>
                <input type="text" id="confirmInputText" class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-red-500 outline-none" autocomplete="off" onpaste="return false;" ondrop="return false;">
            </div>
        ` : '';

        const isDelete = confirmClass.includes('red');
        const iconBg = isDelete ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400';
        const iconName = isDelete ? 'alert-triangle' : 'help-circle';

        content.innerHTML = `
        <div class="p-5 space-y-4">
            <div class="flex items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0">
                        <i data-lucide="${iconName}" class="w-5 h-5"></i>
                    </div>
                    <h3 class="text-base font-extrabold text-gray-900 dark:text-white leading-snug">${title}</h3>
                </div>
                <button id="btnConfirmCloseX" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed">${message}</p>
            ${inputHtml}
            <div class="flex items-center gap-2.5 justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
                <button id="btnConfirmCancel" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-extrabold rounded-xl text-xs sm:text-sm transition-all cursor-pointer">${finalCancelText}</button>
                <button id="btnConfirmAccept" class="px-4 py-2 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-sm transition-all cursor-pointer ${confirmClass}" ${requireText ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>${finalConfirmText}</button>
            </div>
        </div>
        `;
        if (window.lucide) window.lucide.createIcons({ scope: content });
        modal.classList.remove('hidden');

        const btnAccept = document.getElementById('btnConfirmAccept');
        const inputField = document.getElementById('confirmInputText');

        if (requireText && inputField) {
            inputField.addEventListener('input', (e) => {
                if (e.target.value === requireText) {
                    btnAccept.disabled = false;
                    btnAccept.style.opacity = '1';
                    btnAccept.style.cursor = 'pointer';
                } else {
                    btnAccept.disabled = true;
                    btnAccept.style.opacity = '0.5';
                    btnAccept.style.cursor = 'not-allowed';
                }
            });
        }

        const cleanup = () => {
            modal.classList.add('hidden');
            document.getElementById('btnConfirmCloseX')?.removeEventListener('click', onCancel);
            document.getElementById('btnConfirmCancel')?.removeEventListener('click', onCancel);
            btnAccept?.removeEventListener('click', onAccept);
        };

        const onCancel = () => { cleanup(); resolve(false); };
        const onAccept = () => {
            if (requireText && inputField && inputField.value !== requireText) return;
            cleanup();
            resolve(true);
        };

        document.getElementById('btnConfirmCloseX')?.addEventListener('click', onCancel);
        document.getElementById('btnConfirmCancel')?.addEventListener('click', onCancel);
        btnAccept?.addEventListener('click', onAccept);

        if (requireText && inputField) {
            setTimeout(() => inputField.focus(), 100);
        }
    });
};

export function promptModal(title, message, placeholder = '', defaultValue = '') {
    return new Promise((resolve) => {
        const modal = document.getElementById('modalOverlay');
        const content = document.getElementById('modalContent');

        if (content) {
            content.style.height = 'auto';
            content.style.maxHeight = '90vh';
        }

        content.innerHTML = `
        <div class="p-5 space-y-4">
            <div class="flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
                <h3 class="text-base font-extrabold text-gray-900 dark:text-white">${title}</h3>
                <button id="btnPromptCloseX" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium">${message}</p>
            <input type="text" id="promptInputText" class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="${placeholder}" value="${defaultValue}" autocomplete="off">
            <div class="flex items-center gap-2.5 justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
                <button id="btnPromptCancel" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-extrabold rounded-xl text-xs sm:text-sm transition-all cursor-pointer">${window.t('cancel', 'Cancel')}</button>
                <button id="btnPromptSubmit" class="px-4 py-2 bg-indigo-600 text-white font-extrabold hover:bg-indigo-700 rounded-xl text-xs sm:text-sm transition-all shadow-sm cursor-pointer">${window.t('save', 'Submit')}</button>
            </div>
        </div>
        `;
        if (window.lucide) window.lucide.createIcons({ scope: content });
        modal.classList.remove('hidden');

        const inputField = document.getElementById('promptInputText');
        const btnSubmit = document.getElementById('btnPromptSubmit');

        const cleanup = () => {
            modal.classList.add('hidden');
            document.getElementById('btnPromptCloseX').removeEventListener('click', onCancel);
            document.getElementById('btnPromptCancel').removeEventListener('click', onCancel);
            btnSubmit.removeEventListener('click', onSubmit);
        };

        const onCancel = () => { cleanup(); resolve(null); };
        const onSubmit = () => {
            const val = inputField.value.trim();
            cleanup();
            resolve(val);
        };

        document.getElementById('btnPromptCloseX').addEventListener('click', onCancel);
        document.getElementById('btnPromptCancel').addEventListener('click', onCancel);
        btnSubmit.addEventListener('click', onSubmit);

        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') onSubmit();
        });

        setTimeout(() => inputField.focus(), 100);
    });
};

export async function confirmDelete(type, id, name = 'this item') {
    const confirmed = await confirmModal(
        'Confirm Delete',
        `Are you sure you want to delete ${name}? This action cannot be undone.`,
        'Delete',
        'Cancel'
    );

    if (confirmed) {
        const handlers = {
            'sale': () => dbSales.delete(id).then(() => { showToast('Sale deleted'); switchView('sales'); }),
            'expense': () => dbExpenses.delete(id).then(() => { showToast('Expense deleted'); switchView('expenses'); }),
            'inventory': () => dbInventory.delete(id).then(() => { showToast('Item deleted'); switchView('inventory'); }),
            'note': () => dbNotes.delete(id).then(() => { showToast('Note deleted'); switchView('notes'); }),
            'customer': () => dbCustomers.delete(id).then(() => { showToast('Customer deleted'); switchView('customers'); }),
            'loan': () => dbLoans.delete(id).then(() => { showToast('Record deleted'); switchView('loans'); })
        };

        if (handlers[type]) {
            handlers[type]().catch(err => showToast('Delete failed: ' + err.message, 'error'));
        }
    }
};

export const fmt = {
    getSymbol: () => {
        const symbols = {
            'USD': '$', 'EUR': '€', 'GBP': '£', 'KES': 'KSH ',
            'TZS': 'TSh ', 'NGN': '₦', 'UGX': 'USh ', 'ZAR': 'R ', 'INR': '₹'
        };
        const code = (state && state.profile && state.profile.currency) ? state.profile.currency : 'USD';
        return symbols[code] || (code + ' ');
    },
    currency: (n) => {
        const symbol = fmt.getSymbol();
        const val = Number(n);
        if (isNaN(val)) return symbol + '0';
        return symbol + val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    },
    number: (n) => {
        const val = Number(n);
        if (isNaN(val)) return '0';
        return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    },
    parseNumber: (val) => {

        if (!val || typeof val !== 'string') return parseFloat(val) || 0;
        const cleaned = val.toString().replace(/,/g, '').replace(/[^\d.\-]/g, '');
        return parseFloat(cleaned) || 0;
    },
    time: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    dateTime: (d) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    percent: (a, b) => b ? Math.round((a / b) * 100) : 0
};

export function priorityBadge(priority) {
    const map = {
        high: 'bg-red-100 text-red-700',
        medium: 'bg-yellow-100 text-yellow-700',
        low: 'bg-green-100 text-green-700',
        urgent: 'bg-purple-100 text-purple-700'
    };
    return `<span class="badge ${map[priority] || 'bg-gray-100 text-gray-700'}">${priority}</span>`;
};

export function statusBadge(status) {
    const map = {
        completed: 'bg-green-100 text-green-700',
        in_progress: 'bg-blue-100  text-blue-700',
        pending: 'bg-gray-100  text-gray-700',
        active: 'bg-green-100 text-green-700',
        cancelled: 'bg-red-100   text-red-700'
    };
    return `<span class="badge ${map[status] || 'bg-gray-100 text-gray-700'}">${status.replace('_', ' ')}</span>`;
};

export function initNumberFormatting() {
    function shouldFormatInput(target) {
        if (!target || target.tagName !== 'INPUT') return false;
        if (['hidden', 'checkbox', 'radio', 'date', 'datetime-local', 'time', 'file', 'password', 'email', 'search'].includes(target.type)) return false;
        if (target.id === 'ai-chat-input' || target.closest('#ai-assistant-widget') || target.closest('#ai-chat-drawer')) return false;
        if (target.classList.contains('no-number-format') || target.readOnly || target.disabled) return false;
        if (target.classList.contains('number-format')) return true;

        const id = (target.id || '').toLowerCase();
        const name = (target.name || '').toLowerCase();
        const cls = (target.className || '').toLowerCase();
        const text = `${id} ${name} ${cls}`;

        // Exclude non-monetary / non-quantity fields
        if (text.includes('phone') || text.includes('pin') || text.includes('tin') || text.includes('zip') || text.includes('code') || text.includes('sku') || text.includes('tax') || text.includes('time') || text.includes('search') || text.includes('title') || text.includes('name') || text.includes('chat') || text.includes('msg')) return false;

        const isNumeric = /(amount|price|cost|salary|qty|quantity|stock_qty|threshold|unit_price|profit|wage|commission|hourly_rate|principal|balance|interest|repayment|capital|budget|valuation|book_value|target|discount|fee|deposit|withdrawal|opening_cash|initial_balance|rate|sum|total|worth|spending)/i.test(text);

        if (isNumeric || target.type === 'number') {
            target.classList.add('number-format');
            if (target.type === 'number') {
                try {
                    target.type = 'text';
                    target.setAttribute('inputmode', 'decimal');
                } catch (err) {
                    console.warn('[NumberFormat] Could not change input type:', err.message);
                }
            }
            return true;
        }
        return false;
    }

    document.addEventListener('focusin', function(e) {
        shouldFormatInput(e.target);
    }, true);

    document.addEventListener('input', function (e) {
        const target = e.target;
        if (!shouldFormatInput(target)) return;

        let value = target.value.trim();

        if (!value) {
            target.value = '';
            return;
        }

        const isNegative = value.startsWith('-');
        let numericValue = value.replace(/[^\d.]/g, '');

        const parts = numericValue.split('.');
        if (parts.length > 2) {
            numericValue = parts[0] + '.' + parts.slice(1).join('');
        }

        const parts2 = numericValue.split('.');
        const integerPart = parts2[0] || '0';
        const decimalPart = parts2[1] !== undefined ? parts2[1] : null;

        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

        let formatted = isNegative ? '-' : '';
        formatted += formattedInteger;
        if (decimalPart !== null) {
            formatted += '.' + decimalPart;
        }

        target.value = formatted;
    });

    document.addEventListener('blur', function (e) {
        const target = e.target;
        if (!shouldFormatInput(target)) return;

        const value = target.value;
        const num = fmt.parseNumber(value);

        if (num !== 0 || value.trim() !== '') {
            const isNegative = value.trim().startsWith('-');
            const clean = value.replace(/[^\d.]/g, '');
            const parts = clean.split('.');
            const integerPart = parts[0] || '0';
            const decimalPart = parts[1];

            const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

            let formatted = (isNegative ? '-' : '') + formattedInteger;
            if (decimalPart !== undefined && decimalPart.length > 0) {
                formatted += '.' + decimalPart;
            }
            target.value = formatted;
        }
    }, true);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNumberFormatting);
} else {
    initNumberFormatting();
}

let draftSaveTimers = {};

/**
 * Renders or updates a visible (Draft saved) visual badge in the modal header
 */
export function showDraftIndicator(container, stateType = 'saved') {
    if (!container) return;
    const header = container.querySelector('.modal-top-nav') || container.querySelector('header') || container.querySelector('.page-container > div:first-child');
    if (!header) return;

    let badge = header.querySelector('#modalDraftBadge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'modalDraftBadge';
        header.appendChild(badge);
    }

    if (stateType === 'saving') {
        badge.className = 'ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] sm:text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 rounded-full transition-all duration-300 shadow-2xs shrink-0';
        badge.innerHTML = `
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
            <span>Saving draft...</span>
        `;
    } else if (stateType === 'restored') {
        badge.className = 'ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] sm:text-xs font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 rounded-full transition-all duration-300 shadow-2xs shrink-0';
        badge.innerHTML = `
            <i data-lucide="check-check" class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400"></i>
            <span>(Draft saved)</span>
        `;
        if (window.lucide) lucide.createIcons();
    } else { // 'saved'
        badge.className = 'ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] sm:text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 rounded-full transition-all duration-300 shadow-2xs shrink-0';
        badge.innerHTML = `
            <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"></i>
            <span>(Draft saved)</span>
        `;
        if (window.lucide) lucide.createIcons();
    }
}

export { clearFormDraft };

/**
 * Attaches real-time auto-saving for input fields in modals/views to local IndexedDB (Dexie)
 */
export function attachFormDraftAutoSave(modalType, container) {
    if (!modalType || !container || typeof modalType !== 'string' || modalType.endsWith('Details')) return;
    const formEl = container.querySelector('form') || container;

    const handler = () => {
        showDraftIndicator(container, 'saving');
        if (draftSaveTimers[modalType]) clearTimeout(draftSaveTimers[modalType]);
        draftSaveTimers[modalType] = setTimeout(async () => {
            try {
                const draft = {};
                // Standard input & textarea fields
                const inputs = formEl.querySelectorAll('input:not([type="password"]):not([type="hidden"]), textarea, select');
                inputs.forEach(input => {
                    const key = input.id || input.name;
                    if (key && input.value !== undefined) {
                        draft[key] = input.value;
                    }
                });

                // Hidden inputs (e.g. premium dropdown selected values)
                const hiddenSelects = formEl.querySelectorAll('input[type="hidden"][id]');
                hiddenSelects.forEach(hInput => {
                    if (hInput.id && !hInput.id.startsWith('bms_') && hInput.id !== 'csrf_token') {
                        draft[hInput.id] = hInput.value;
                    }
                });

                // Multi-item cart batch items if applicable
                if (Array.isArray(window.saleCartItems) && window.saleCartItems.length > 0) {
                    draft._saleCartItems = window.saleCartItems;
                }
                if (Array.isArray(window._batchLoansList) && window._batchLoansList.length > 0) {
                    draft._batchLoansList = window._batchLoansList;
                }
                if (Array.isArray(window._batchAssetsList) && window._batchAssetsList.length > 0) {
                    draft._batchAssetsList = window._batchAssetsList;
                }

                if (Object.keys(draft).length > 0) {
                    await saveFormDraft(modalType, draft);
                    showDraftIndicator(container, 'saved');
                }
            } catch (err) {
                console.warn(`[DraftAutoSave] Error auto-saving draft for ${modalType}:`, err);
            }
        }, 300);
    };

    formEl.addEventListener('input', handler, { passive: true });
    formEl.addEventListener('change', handler, { passive: true });
}

/**
 * Hydrates saved form draft from local IndexedDB (Dexie) into inputs
 */
export async function hydrateFormDraft(modalType, container) {
    if (!modalType || !container || typeof modalType !== 'string' || modalType.endsWith('Details')) return;
    try {
        const draft = await getFormDraft(modalType);
        if (!draft || typeof draft !== 'object') return;

        const formEl = container.querySelector('form') || container;
        let restoredAny = false;
        Object.entries(draft).forEach(([key, val]) => {
            if (key === '_saleCartItems' && Array.isArray(val) && val.length > 0) {
                window.saleCartItems = val;
                if (typeof window.renderSaleCartTable === 'function') {
                    window.renderSaleCartTable();
                }
                restoredAny = true;
                return;
            }
            if (key === '_batchLoansList' && Array.isArray(val) && val.length > 0) {
                window._batchLoansList = val;
                if (typeof window.renderBatchLoansPreview === 'function') {
                    window.renderBatchLoansPreview();
                }
                restoredAny = true;
                return;
            }
            if (key === '_batchAssetsList' && Array.isArray(val) && val.length > 0) {
                window._batchAssetsList = val;
                if (typeof window.renderBatchAssetsPreview === 'function') {
                    window.renderBatchAssetsPreview();
                }
                restoredAny = true;
                return;
            }

            const input = formEl.querySelector(`#${key}`) || formEl.querySelector(`[name="${key}"]`);
            if (input && val !== undefined && val !== null && val !== '') {
                input.value = val;
                restoredAny = true;

                // Update Premium Select display label if present
                const labelSpan = formEl.querySelector(`#label-${key}`);
                if (labelSpan) {
                    const itemEl = formEl.querySelector(`.dropdown-premium-item[data-value="${val}"]`);
                    const lblText = itemEl ? (itemEl.querySelector('span')?.textContent?.trim() || val) : val;
                    labelSpan.textContent = lblText;
                    labelSpan.classList.remove('text-gray-400', 'font-normal');
                    labelSpan.classList.add('text-gray-900', 'dark:text-white', 'font-bold');
                }
            }
        });

        // Trigger reactive calculations across all form modules upon draft restoration
        if (typeof window.calcCentralFinancials === 'function') {
            window.calcCentralFinancials();
        }
        if (typeof window.calcEditCentralFinancials === 'function') {
            window.calcEditCentralFinancials();
        }
        if (typeof window.updateSaleTotal === 'function') {
            window.updateSaleTotal();
        }
        if (typeof window.calcExpensesForm === 'function') {
            window.calcExpensesForm();
        }

        if (restoredAny) {
            showDraftIndicator(container, 'saved');
        }
    } catch (err) {
        console.warn(`[DraftHydrate] Error hydrating draft for ${modalType}:`, err);
    }
}

if (typeof window !== 'undefined') {
    window.showDraftIndicator = showDraftIndicator;
    window.attachFormDraftAutoSave = attachFormDraftAutoSave;
    window.hydrateFormDraft = hydrateFormDraft;
    window.clearFormDraft = clearFormDraft;
}

export function openModal(type, data = null, bypassHistory = false, modalName = null) {
    let html = null;
    if (typeof type === 'string' && type.trim().startsWith('<')) {
        html = type;
    } else if (window.getModalHTML) {
        html = window.getModalHTML(type, data);
    }

    if (!html) return;

    const modalKey = modalName || (typeof type === 'string' && !type.trim().startsWith('<') ? type : state._currentModalType || 'custom_raw');

    if (!bypassHistory) {
        const historyItem = {
            type: state._currentModalType ? 'modal' : 'view',
            viewId: state.activeView || null,
            context: state.activeViewContext || null,
            modalType: modalKey,
            modalData: state._currentModalData || null
        };
        if (!state._modalHistory) state._modalHistory = [];
        state._modalHistory.push(historyItem);
    }

    state._currentModalType = modalKey;
    state._currentModalData = data;

    if (modalKey && typeof modalKey === 'string' && !modalKey.trim().startsWith('<')) {
        try {
            sessionStorage.setItem('bms_active_modal', JSON.stringify({ type: modalKey, data, viewId: state.activeView, context: state.activeViewContext }));
        } catch (e) {}

        if (modalKey.endsWith('Details') && data && data.id) {
            try {
                const cleanType = modalKey.replace(/Details$/, '');
                sessionStorage.setItem('bms_active_details_modal', JSON.stringify({ type: cleanType, id: data.id }));
            } catch (e) {}
        }
    }



    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
        mainContent.classList.add('overflow-hidden', '!p-0');
        mainContent.classList.remove('overflow-y-auto');

        mainContent.innerHTML = `
            <div class="page-container w-full h-full bg-white dark:bg-gray-900 rounded-none border-0 shadow-none overflow-hidden flex flex-col">
                ${html}
            </div>
        `;

        const navHeader = mainContent.querySelector('.modal-top-nav') || mainContent.querySelector('header') || mainContent.querySelector('.page-container > div:first-child');
        if (navHeader) {
            const headerCloseBtns = Array.from(navHeader.querySelectorAll('button[onclick*="closeModal"], button[onclick*="closeCentralInventoryModal"], button[onclick*="close"]'));
            
            if (headerCloseBtns.length === 0) {
                const allCloseBtns = Array.from(mainContent.querySelectorAll('button[onclick*="closeModal"], button[onclick*="closeCentralInventoryModal"], button[onclick*="close"]'));
                const nonFooterBtn = allCloseBtns.find(btn => !btn.closest('.modal-bottom-nav') && !btn.closest('footer'));
                if (nonFooterBtn) headerCloseBtns.push(nonFooterBtn);
            }

            if (headerCloseBtns.length > 0) {
                const primaryBtn = headerCloseBtns[0];
                const backText = primaryBtn.dataset.closeText || (typeof window.t === 'function' ? window.t('back', 'Back') : 'Back');
                primaryBtn.innerHTML = `<i data-lucide="chevron-left" class="w-4 h-4"></i><span>${backText}</span>`;
                primaryBtn.className = "inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60";

                // Deduplicate any extra header close buttons
                headerCloseBtns.slice(1).forEach(btn => btn.remove());

                const parentDiv = primaryBtn.parentElement;
                if (parentDiv && parentDiv !== navHeader && parentDiv.children.length === 1 && !parentDiv.querySelector('h1, h2, h3')) {
                    parentDiv.remove();
                }

                navHeader.classList.add('flex', 'items-center', 'gap-3.5', 'justify-start', 'flex-none');
                navHeader.classList.remove('justify-between');
                navHeader.insertBefore(primaryBtn, navHeader.firstChild);
            }
        }

        const footers = mainContent.querySelectorAll('.modal-bottom-nav, footer');
        footers.forEach(footer => {
            if (footer && footer.querySelectorAll('button').length > 0 && !footer.classList.contains('modal-top-nav')) {
                footer.classList.remove('justify-end', 'justify-between');
                footer.classList.add('justify-center', 'items-center');
            }
        });
    }

    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) modalOverlay.classList.add('hidden');

    // Purge any lingering sidebar spinners
    document.querySelectorAll('.loader-spin').forEach(el => el.remove());

    if (window.lucide) lucide.createIcons();
    if (window.initNumberFormatting) window.initNumberFormatting();

    if (type === 'inventoryDetails' && data && data.sku && typeof JsBarcode !== 'undefined') {
        setTimeout(() => {
            try {
                JsBarcode(`#barcode-${data.id}`, data.sku, {
                    format: "CODE128", width: 2, height: 50, displayValue: true, fontSize: 14, margin: 0
                });
            } catch (e) {  }
        }, 50);
    }

    if (type === 'branchDetails') {
        setTimeout(() => {
            if (typeof window.renderBranchDetailsTable === 'function') {
                window.renderBranchDetailsTable();
            }
        }, 50);
    }

    const supplierSelects = {
        'addInventoryItem': 'itemSupplier',
        'restockStock': 'restockSupplier',
        'editInventoryAddRequest': 'editItemSupplierAdd',
        'editRestockRequest': 'editRestockSupplier'
    };

    if (supplierSelects[type]) {
        let currentVal = null;
        if (data && (type === 'editInventoryAddRequest' || type === 'editRestockRequest')) {
            currentVal = data.metadata ? data.metadata.supplier : null;
        }
        if (window.populateSupplierSelect) window.populateSupplierSelect(supplierSelects[type], currentVal);
    }

    if (type === 'addPO') {
        setTimeout(() => { if (window.initPoModal) window.initPoModal() }, 50);
    }
    if (type === 'createQuotation') {
        setTimeout(() => { if (window.initQuoteModal) window.initQuoteModal() }, 50);
    }

    setTimeout(() => {
        if (mainContent) {
            hydrateFormDraft(modalKey, mainContent);
            attachFormDraftAutoSave(modalKey, mainContent);
        }
    }, 60);
}

export function closeModal() {
    try {
        sessionStorage.removeItem('bms_active_stock_ops');
        sessionStorage.removeItem('bms_active_modal');
        sessionStorage.removeItem('bms_active_details_modal');
    } catch (e) {}

    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) modalOverlay.classList.add('hidden');
    const modalContent = document.getElementById('modalContent');
    if (modalContent) modalContent.innerHTML = '';

    const mainContent = document.getElementById('mainContent');
    if (mainContent && mainContent.querySelector('.page-container')) {
        mainContent.classList.remove('overflow-hidden', '!p-0');
        mainContent.classList.add('overflow-y-auto');
        mainContent.innerHTML = '';
    }

    state._currentModalType = null;
    state._currentModalData = null;

    if (state._modalHistory && state._modalHistory.length > 0) {
        const prev = state._modalHistory.pop();
        if (prev.type === 'modal') {
            if (prev.modalType && prev.modalType.endsWith('Details') && prev.modalData && prev.modalData.id) {
                try {
                    const cleanType = prev.modalType.replace(/Details$/, '');
                    sessionStorage.setItem('bms_active_details_modal', JSON.stringify({ type: cleanType, id: prev.modalData.id }));
                } catch (e) {}
            }
            openModal(prev.modalType, prev.modalData, true);
            return;
        } else if (prev.viewId) {
            if (window.switchView) {
                window.switchView(prev.viewId, prev.context, true);
            }
            return;
        }
    }

    const fallbackView = state.activeView || (state.role === 'owner' ? 'overview' : (state.role === 'branch' ? 'dashboard' : 'overview'));
    if (window.switchView) {
        window.switchView(fallbackView, state.activeViewContext || null, true);
    }
}

export function addActivity(type, message, branchName, amount = null) {
    const activity = { type, message, branch: branchName, amount, time: fmt.time() };
    if (!state.activities) state.activities = [];
    state.activities.unshift(activity);
    if (state.activities.length > 50) state.activities.pop();

    const feed = document.getElementById('activityFeed');
    if (feed) {
        feed.innerHTML = renderActivities();
        lucide.createIcons();
    }

    const badge = document.getElementById('notifBadge');
    if (badge) badge.classList.remove('hidden');
};

export async function updateApp() {
    try {
        const overlay = document.createElement('div');
        overlay.className = 'update-overlay';
        overlay.innerHTML = `
            <div class="update-icon-wrapper">
                <i data-lucide="wrench" class="update-icon-main w-20 h-20"></i>
                <i data-lucide="settings" class="update-icon-sub w-10 h-10"></i>
            </div>
            <h2 class="update-text" id="update-status-text">Updating your workspace...</h2>
            <p class="update-subtext" id="update-sub-text">Fetching latest improvements and refreshing cache.</p>
        `;
        document.body.appendChild(overlay);
        if (window.lucide) lucide.createIcons();

        // 1. Sync pending offline mutations if online
        try {
            if (window.localDb && window.localDb.sync_queue && window.navigator.onLine) {
                if (window.syncManager && typeof window.syncManager.processPendingQueue === 'function') {
                    await Promise.race([
                        window.syncManager.processPendingQueue(),
                        new Promise(resolve => setTimeout(resolve, 2000))
                    ]);
                }
            }
        } catch (syncErr) {
            console.warn('[Update] Offline sync check warning:', syncErr);
        }

        // 2. Upgrade Service Worker & swap caches gracefully without unregistering
        if ('serviceWorker' in navigator) {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const reg of registrations) {
                    if (reg.waiting) {
                        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                    await reg.update().catch(() => {});
                }
            } catch (swErr) {
                console.warn('[Update] Service Worker update notice:', swErr);
            }
        }

        if ('caches' in window) {
            try {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
            } catch (cacheErr) {
                console.warn('[Update] Cache purge notice:', cacheErr);
            }
        }

        // 3. Reset in-memory cached modules
        window._cachedCentralItems = null;
        window._cachedBranchInventory = null;
        window.currentAllStaff = null;
        window.currentPayrollList = null;
        window.currentSuppliersList = null;

        await new Promise(resolve => setTimeout(resolve, 1500));

        const statusText = document.getElementById('update-status-text');
        const subText = document.getElementById('update-sub-text');
        const iconWrapper = overlay.querySelector('.update-icon-wrapper');

        if (statusText && subText && iconWrapper) {
            iconWrapper.innerHTML = `<i data-lucide="thumbs-up" class="success-check w-20 h-20"></i>`;
            statusText.textContent = "Workspace Updated!";
            subText.textContent = "Your workspace is ready with the latest enhancements.";
            if (window.lucide) lucide.createIcons();
        }

        await new Promise(resolve => setTimeout(resolve, 800));

        const cleanPath = window.location.pathname;
        const cleanHash = window.location.hash || '';
        const bustUrl = `${window.location.origin}${cleanPath}?_v=${Date.now()}${cleanHash}`;
        window.location.replace(bustUrl);
    } catch (err) {
        console.error('Update failed:', err);
        window.location.reload(true);
    }
}

export async function clearAllCache() {
    if (typeof showLoader === 'function') {
        showLoader(window.t ? window.t('clearing_cache_full', 'Purging all cache, offline storage & sessions...') : 'Purging all cache, offline storage & sessions...');
    }

    try {
        // 1. Terminate cloud Supabase auth session if online
        try {
            if (window.supabase?.auth && typeof window.supabase.auth.signOut === 'function') {
                await Promise.race([
                    window.supabase.auth.signOut(),
                    new Promise(resolve => setTimeout(resolve, 1200))
                ]);
            }
        } catch (authErr) {
            console.warn('[Cache] Supabase signOut notice:', authErr);
        }

        // 2. Purge all CacheStorage caches
        if ('caches' in window) {
            try {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
            } catch (cacheErr) {
                console.warn('[Cache] Cache storage purge notice:', cacheErr);
            }
        }

        // 3. Purge all IndexedDB databases (Dexie BMSTZ_LocalDB, offline queues, snapshots)
        if ('indexedDB' in window) {
            try {
                if (window.localDb && typeof window.localDb.delete === 'function') {
                    await window.localDb.delete().catch(() => {});
                }
                if (typeof indexedDB.databases === 'function') {
                    const dbs = await indexedDB.databases();
                    for (const db of dbs) {
                        if (db.name) {
                            indexedDB.deleteDatabase(db.name);
                        }
                    }
                } else {
                    indexedDB.deleteDatabase('BMSTZ_LocalDB');
                    indexedDB.deleteDatabase('OfflineQueueDB');
                    indexedDB.deleteDatabase('bms_offline_queue');
                    indexedDB.deleteDatabase('bms_db');
                }
            } catch (idbErr) {
                console.warn('[Cache] IndexedDB purge notice:', idbErr);
            }
        }

        // 4. Purge localStorage completely (including all sessions, tokens, roles, and device caches)
        try {
            localStorage.clear();
        } catch (e) {}

        // 5. Purge sessionStorage completely
        try {
            sessionStorage.clear();
        } catch (e) {}

        // 6. Signal Service Worker to clear caches, skip waiting, and unregister
        if ('serviceWorker' in navigator) {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const reg of registrations) {
                    if (reg.active) {
                        reg.active.postMessage({ type: 'CLEAR_CACHE' });
                    }
                    if (reg.waiting) {
                        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                    await reg.unregister().catch(() => {});
                }
            } catch (swErr) {
                console.warn('[Cache] Service Worker unregister notice:', swErr);
            }
        }

        // 7. Reset in-memory cached modules, channels & state
        try {
            if (typeof window.destroyRealtimeSync === 'function') {
                window.destroyRealtimeSync();
            }
        } catch (e) {}

        window._cachedCentralItems = null;
        window._cachedBranchInventory = null;
        window._cachedOverview = null;
        window._salePriceMap = null;
        window.currentAllStaff = null;
        window.currentPayrollList = null;
        window.currentSuppliersList = null;
        if (window.state) {
            window.state.profile = null;
            window.state.branchProfile = null;
            window.state.ownerId = null;
            window.state.branchId = null;
            window.state.role = null;
            window.state.currentUser = null;
            window.state.currentUserUuid = null;
            window.state.branches = [];
        }
        if (typeof window.clearViewModuleErrors === 'function') {
            window.clearViewModuleErrors();
        }

        if (typeof showToast === 'function') {
            showToast(window.t ? window.t('cache_and_session_cleared', 'All cache and sessions cleared successfully!') : 'All cache and sessions cleared successfully!', 'success');
        }

        // 8. Redirect cleanly to login entry point
        const cleanLoginUrl = `${window.location.origin}/app?_reset=${Date.now()}`;

        setTimeout(() => {
            window.location.replace(cleanLoginUrl);
        }, 300);
    } catch (err) {
        console.error('[Cache] Complete clear error:', err);
        try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
        if (typeof showToast === 'function') showToast('Cache wiped! Reloading...', 'info');
        setTimeout(() => window.location.replace(`${window.location.origin}/app?_reset=${Date.now()}`), 400);
    } finally {
        setTimeout(() => {
            if (typeof hideLoader === 'function') hideLoader();
        }, 800);
    }
}
window.clearAllCache = clearAllCache;

export async function confirmUpdateApp() {
    updateApp();
};

export function parseCSV(csvString) {
    if (!csvString) return [];
    
    // Ignore empty lines AND comment/instruction rows starting with '#' or '//'
    const lines = csvString
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line !== '' && !line.startsWith('#') && !line.startsWith('//'));

    if (lines.length === 0) return [];

    const parseLine = (line, delimiter = ',') => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' && line[i + 1] === '"' && inQuotes) {
                cur += '"';
                i++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                result.push(cur);
                cur = '';
            } else {
                cur += char;
            }
        }
        result.push(cur);
        return result.map(s => s.trim());
    };

    let delimiter = ',';
    if (!lines[0].includes(',') && lines[0].includes(';')) {
        delimiter = ';';
    }

    const headers = parseLine(lines[0], delimiter).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const rowData = parseLine(lines[i], delimiter);

        if (rowData.join('').trim() === '') continue;
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = rowData[j] || '';
        }
        data.push(obj);
    }
    return data;
};

export function ensureXLSX() {
    return new Promise((resolve, reject) => {
        if (typeof window.XLSX !== 'undefined') {
            return resolve(window.XLSX);
        }
        const existingScript = document.querySelector('script[src*="xlsx.full.min.js"]');
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(window.XLSX));
            existingScript.addEventListener('error', () => reject(new Error('Failed to load XLSX')));
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = () => resolve(window.XLSX);
        script.onerror = () => reject(new Error('Failed to load XLSX'));
        document.head.appendChild(script);
    });
}

export async function downloadCSVTemplate(fileName, headers, instructions = [], sampleRows = []) {
    const hasInstructions = instructions && instructions.length > 0;
    const allHeaders = [...headers];
    if (hasInstructions) {
        allHeaders.push('', ''); // 2 blank spacer columns
        allHeaders.push('INSTRUCTIONS_DO_NOT_DELETE_OR_MODIFY');
    }

    const rowsData = [allHeaders];
    const maxRows = Math.max(sampleRows.length, instructions.length);

    for (let i = 0; i < maxRows; i++) {
        const rowVals = [];
        const sample = sampleRows[i] || [];
        for (let j = 0; j < headers.length; j++) {
            rowVals.push(sample[j] !== undefined && sample[j] !== null ? String(sample[j]) : '');
        }
        if (hasInstructions) {
            rowVals.push(''); // Spacer Column 1
            rowVals.push(''); // Spacer Column 2
            
            // Sanitize text so Excel never tries to parse leading -, +, =, @ as formula (#NAME?)
            let instText = instructions[i] || '';
            const trimmed = instText.trim();
            if (trimmed.startsWith('-') || trimmed.startsWith('+') || trimmed.startsWith('=') || trimmed.startsWith('@')) {
                instText = '• ' + trimmed.substring(1).trim();
            }
            rowVals.push(instText);
        }
        rowsData.push(rowVals);
    }

    // Generate Excel (.xlsx) with auto-stretched column widths
    try {
        const xlsx = await ensureXLSX();
        if (xlsx) {
            const ws = xlsx.utils.aoa_to_sheet(rowsData);

            // Compute optimal stretched column widths
            const colWidths = [];
            const numCols = allHeaders.length;

            for (let c = 0; c < numCols; c++) {
                let maxLen = 0;
                for (let r = 0; r < rowsData.length; r++) {
                    const val = rowsData[r][c];
                    if (val !== undefined && val !== null) {
                        const strVal = String(val);
                        if (strVal.length > maxLen) {
                            maxLen = strVal.length;
                        }
                    }
                }

                // Apply compact, snug padding tailored to content length
                const headerName = (allHeaders[c] || '').toLowerCase();
                let width = maxLen + 2;

                if (headerName === '') {
                    width = 2; // Spacer column
                } else if (headerName.includes('instructions')) {
                    width = Math.min(Math.max(width, 40), 65);
                } else if (headerName === 'name' || headerName.includes('item') || headerName.includes('service_name')) {
                    width = Math.min(Math.max(width, 16), 26);
                } else if (headerName === 'category') {
                    width = Math.min(Math.max(width, 12), 16);
                } else if (headerName.includes('price') || headerName.includes('cost') || headerName.includes('stock') || headerName.includes('threshold') || headerName === 'sku' || headerName === 'unit') {
                    width = Math.min(Math.max(width, 10), 15);
                } else if (headerName === 'description' || headerName.includes('notes')) {
                    width = Math.min(Math.max(width, 16), 28);
                } else {
                    width = Math.min(Math.max(width, 10), 20);
                }

                colWidths.push({ wch: width });
            }

            ws['!cols'] = colWidths;

            const wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, 'Template');
            
            const excelFileName = fileName.replace(/\.csv$/i, '.xlsx');
            xlsx.writeFile(wb, excelFileName);
            return;
        }
    } catch (err) {
        console.warn('[downloadCSVTemplate] Excel engine unavailable, falling back to CSV:', err);
    }

    // Fallback to standard CSV if XLSX is unavailable
    let csv = rowsData.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

export function triggerCSVUpload(onParsedCallback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

        if (isExcel) {
            const processExcel = () => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        if (typeof window.XLSX === 'undefined') {
                            throw new Error('Excel parser library not available');
                        }
                        const data = new Uint8Array(e.target.result);
                        const workbook = window.XLSX.read(data, { type: 'array' });
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        const rawData = window.XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                        
                        // Standardize keys so getVal(...) works seamlessly
                        const cleanData = rawData.map(row => {
                            const cleanedRow = {};
                            Object.keys(row).forEach(k => {
                                const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
                                cleanedRow[cleanKey] = row[k];
                                cleanedRow[k] = row[k]; // Keep original key as well
                            });
                            return cleanedRow;
                        });

                        if (typeof onParsedCallback === 'function') {
                            onParsedCallback(cleanData);
                        }
                    } catch (err) {
                        console.error('[ExcelImport] Error:', err);
                        if (window.showToast) window.showToast('Failed to parse Excel file: ' + err.message, 'error');
                    }
                };
                reader.readAsArrayBuffer(file);
            };

            // Dynamically load XLSX script if not yet present
            ensureXLSX().then(processExcel).catch(() => {
                if (window.showToast) window.showToast('Failed to load Excel parser engine', 'error');
            });
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                const data = parseCSV(text);
                if (typeof onParsedCallback === 'function') {
                    onParsedCallback(data);
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
};

export const triggerSpreadsheetUpload = triggerCSVUpload;

let _pdfLibLoadingPromise = null;
export async function ensurePdfLibraries() {
    if (window.jspdf?.jsPDF && window.jspdf?.jsPDF?.API?.autoTable) {
        return window.jspdf;
    }
    if (_pdfLibLoadingPromise) {
        return _pdfLibLoadingPromise;
    }

    _pdfLibLoadingPromise = (async () => {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            await new Promise((resolve, reject) => {
                const existing = document.querySelector('script[src*="jspdf.umd.min.js"]');
                if (existing && window.jspdf?.jsPDF) return resolve();
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Failed to load jsPDF library'));
                document.head.appendChild(script);
            });
        }
        if (!window.jspdf?.jsPDF?.API?.autoTable) {
            await new Promise((resolve, reject) => {
                const existing = document.querySelector('script[src*="jspdf.plugin.autotable"]');
                if (existing && window.jspdf?.jsPDF?.API?.autoTable) return resolve();
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Failed to load jsPDF AutoTable plugin'));
                document.head.appendChild(script);
            });
        }
        return window.jspdf;
    })();

    try {
        const result = await _pdfLibLoadingPromise;
        return result;
    } catch (e) {
        _pdfLibLoadingPromise = null;
        throw e;
    }
}
window.ensurePdfLibraries = ensurePdfLibraries;

let _interFontCached = null;
export async function ensureInterFont(doc) {
    try {
        if (!_interFontCached) {
            const [res400, res700] = await Promise.all([
                fetch('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf'),
                fetch('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf')
            ]);
            if (res400.ok && res700.ok) {
                const [buf400, buf700] = await Promise.all([res400.arrayBuffer(), res700.arrayBuffer()]);
                const toBase64 = (buffer) => {
                    let binary = '';
                    const bytes = new Uint8Array(buffer);
                    const len = bytes.byteLength;
                    for (let i = 0; i < len; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    return window.btoa(binary);
                };
                _interFontCached = {
                    regular: toBase64(buf400),
                    bold: toBase64(buf700)
                };
            }
        }

        if (_interFontCached && doc) {
            doc.addFileToVFS('Inter-Regular.ttf', _interFontCached.regular);
            doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');

            doc.addFileToVFS('Inter-Bold.ttf', _interFontCached.bold);
            doc.addFont('Inter-Bold.ttf', 'Inter', 'bold');

            doc.setFont('Inter', 'normal');
            return true;
        }
    } catch (e) {
        console.warn('[PDF] Inter font load warning, using standard fallback:', e.message);
    }
    return false;
}
window.ensureInterFont = ensureInterFont;

export function normalizeReportText(text) {
    if (!text) return '';
    return text
        .normalize('NFKC')
        .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
        .replace(/(?:^|(?<=[^A-Za-z0-9]))((?:[A-Za-z0-9]\s+){2,}[A-Za-z0-9])(?=[^A-Za-z0-9]|$)/g, (match) => {
            const words = match.split(/\s{2,}/);
            return words.map(w => w.replace(/\s+/g, '')).join(' ');
        })
        .replace(/(\d+)\s*\/\s*%/g, '$1%')
        .replace(/(\d+)\s+(\d+)\s+(weeks|days|months|years|hours)/gi, '$1-$2 $3')
        .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
        .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
        .replace(/[\u2013\u2014\u2015]/g, '-')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
}
window.normalizeReportText = normalizeReportText;

let _globalDebounceTimers = {};
export function debounce(key, fn, delay = 400) {
    clearTimeout(_globalDebounceTimers[key]);
    _globalDebounceTimers[key] = setTimeout(fn, delay);
};

export function formatLoaderDots(message = "Just a moment...") {
    if (!message) return 'Just a moment...';
    if (typeof message !== 'string') return message;
    if (message.includes('<span')) return message;
    if (message.includes('...')) {
        const base = message.replace(/\.+$/, '').trim();
        return `${base}<span class="inline-flex items-center ml-1 gap-1 text-indigo-600 dark:text-indigo-400 align-baseline"><span class="inline-block w-1.5 h-1.5 rounded-full bg-current animate-ping-dot-1"></span><span class="inline-block w-1.5 h-1.5 rounded-full bg-current animate-ping-dot-2"></span><span class="inline-block w-1.5 h-1.5 rounded-full bg-current animate-ping-dot-3"></span></span>`;
    }
    return message;
}

export function showLoader(message = "Just a moment...") {
    const loader = document.getElementById("global-loader");
    const msgEl = document.getElementById("loader-message");
    if (loader && msgEl) {
        msgEl.innerHTML = formatLoaderDots(message);
        loader.classList.remove("hidden");
        loader.style.display = 'flex';
        loader.style.opacity = '1';
        loader.style.visibility = 'visible';
    }
};

export function hideLoader() {
    const loader = document.getElementById("global-loader");
    if (loader) {
        loader.classList.add("hidden");
        loader.style.display = '';
        loader.style.opacity = '';
        loader.style.visibility = '';
    }
};

export function triggerAppRefresh(btn) {
    const getRefreshIcons = () => document.querySelectorAll('button[onclick*="triggerAppRefresh"] i, button[onclick*="triggerAppRefresh"] svg, button[onclick*="triggerAppRefresh"]');
    getRefreshIcons().forEach(el => el.classList.add('animate-spin'));

    try {
        if (typeof showLoader === 'function') {
            showLoader(window.t ? window.t('refreshing_data', 'Refreshing data...') : 'Refreshing data...');
        }

        // Invalidate in-memory & session data caches so re-fetch is clean
        window._cachedCentralItems = null;
        window._cachedBranchInventory = null;
        window._cachedOverview = null;
        window._salePriceMap = null;
        try {
            sessionStorage.removeItem('bms_cached_overview');
            sessionStorage.removeItem('bms_cached_central_items');
            sessionStorage.removeItem('bms_chunk_heal_attempt');
        } catch (e) {}

        // Preserve current active view in URL hash if logged in
        if (window.state?.activeView) {
            try {
                window.location.hash = '#view=' + window.state.activeView;
            } catch (e) {}
        }
    } catch (err) {
        console.warn('[App] Refresh notice:', err);
    }

    // Perform full page reload & re-fetch
    setTimeout(() => {
        window.location.reload();
    }, 150);
};

if (typeof window !== 'undefined') {
    window.triggerAppRefresh = triggerAppRefresh;
    window.showLoader = showLoader;
    window.hideLoader = hideLoader;
    window.renderLoader = renderPremiumLoader;
}

export function renderPremiumLoader(message = "Loading...") {
    return `
    <div class="flex flex-col items-center justify-center py-16 w-full">
        <svg 
            class="animate-spin w-12 h-12 text-indigo-600 dark:text-indigo-400" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round" 
            stroke-linejoin="round"
        >
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
        <p class="loader-text mt-3 text-center flex items-center justify-center">${formatLoaderDots(message)}</p>
    </div>`;
};

export const renderLoader = renderPremiumLoader;

export function generateAutoSKU(category = '', name = '', optionalId = null) {
    const cleanCat = (category || 'GEN').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cleanName = (name || 'ITM').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    const catPrefix = cleanCat.substring(0, 3).padEnd(3, 'X');
    const namePrefix = cleanName.substring(0, 3).padEnd(3, 'X');

    let suffix = '';
    if (optionalId) {
        const idStr = String(optionalId).replace(/[^0-9]/g, '');
        if (idStr.length >= 4) suffix = idStr.slice(-4);
        else if (idStr.length > 0) suffix = idStr.padStart(4, '0');
    }
    if (!suffix || suffix.length < 4) {
        suffix = String(Math.floor(1000 + Math.random() * 9000));
    }

    return `${catPrefix}-${namePrefix}-${suffix}`;
}

export function downloadBarcodeImage(sku, productName = 'product') {
    if (!sku) {
        if (typeof showToast === 'function') showToast('No SKU available to generate barcode image.', 'warning');
        return;
    }

    try {
        if (typeof JsBarcode === 'undefined') {
            if (typeof showToast === 'function') showToast('JsBarcode library not loaded.', 'error');
            return;
        }

        // 1. Generate standard barcode on a temp canvas
        const tempCanvas = document.createElement('canvas');
        JsBarcode(tempCanvas, sku, {
            format: 'CODE128',
            width: 2,
            height: 70,
            displayValue: true,
            fontSize: 15,
            font: 'monospace',
            margin: 12,
            background: '#ffffff',
            lineColor: '#000000'
        });

        const displayName = (productName && productName.toLowerCase() !== 'product') 
            ? String(productName).trim() 
            : '';

        // 2. Compose final canvas with product name centered underneath SKU code
        const finalCanvas = document.createElement('canvas');
        const extraBottomHeight = displayName ? 28 : 0;
        
        finalCanvas.width = Math.max(tempCanvas.width, displayName ? Math.min(displayName.length * 9 + 40, 400) : 0);
        finalCanvas.height = tempCanvas.height + extraBottomHeight;

        const ctx = finalCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

        // Center barcode horizontally
        const barcodeX = Math.round((finalCanvas.width - tempCanvas.width) / 2);
        ctx.drawImage(tempCanvas, barcodeX, 0);

        // Render product name centered below SKU
        if (displayName) {
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let textToDraw = displayName;
            const maxTextWidth = finalCanvas.width - 24;
            if (ctx.measureText(textToDraw).width > maxTextWidth) {
                while (textToDraw.length > 4 && ctx.measureText(textToDraw + '...').width > maxTextWidth) {
                    textToDraw = textToDraw.slice(0, -1);
                }
                textToDraw += '...';
            }

            ctx.fillText(textToDraw, finalCanvas.width / 2, tempCanvas.height + 4);
        }

        const cleanName = String(productName).toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 20);
        const fileName = `${sku}_${cleanName || 'barcode'}.png`;

        const link = document.createElement('a');
        link.download = fileName;
        link.href = finalCanvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (typeof showToast === 'function') {
            showToast(`Barcode image downloaded: ${fileName}`, 'success');
        }
    } catch (e) {
        console.error('[BarcodeExport] Error generating PNG:', e);
        if (typeof showToast === 'function') showToast('Failed to export barcode image.', 'error');
    }
}

export function printBarcodeLabel(sku, productName = '', price = null) {
    if (!sku) {
        if (typeof showToast === 'function') showToast('No SKU available to print label.', 'warning');
        return;
    }

    try {
        if (typeof JsBarcode === 'undefined') {
            if (typeof showToast === 'function') showToast('JsBarcode library not loaded.', 'error');
            return;
        }

        const tempCanvas = document.createElement('canvas');
        JsBarcode(tempCanvas, sku, {
            format: 'CODE128',
            width: 2,
            height: 60,
            displayValue: true,
            fontSize: 14,
            font: 'monospace',
            margin: 8,
            background: '#ffffff',
            lineColor: '#000000'
        });

        const barcodeDataUrl = tempCanvas.toDataURL('image/png');
        const printWindow = window.open('', '_blank', 'width=420,height=320');
        if (!printWindow) {
            if (typeof showToast === 'function') showToast('Please allow popups to print barcode labels.', 'warning');
            return;
        }

        const priceFormatted = price ? (window.fmt?.currency(price) || price) : '';
        const priceHtml = priceFormatted ? `<div style="font-size: 14px; font-weight: 800; margin-top: 4px; color: #0f172a;">${priceFormatted}</div>` : '';
        const nameHtml = productName ? `<div style="font-size: 12px; font-weight: 700; max-width: 260px; margin: 4px auto 0; line-height: 1.25; color: #334155; word-wrap: break-word;">${productName}</div>` : '';

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Barcode Label - ${sku}</title>
                <style>
                    @page { margin: 0; size: auto; }
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; margin: 0; padding: 12px; background: #fff; }
                    img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
                </style>
            </head>
            <body>
                <img src="${barcodeDataUrl}" alt="${sku}" />
                ${nameHtml}
                ${priceHtml}
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 600);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    } catch (e) {
        console.error('[BarcodePrint] Error:', e);
        if (typeof showToast === 'function') showToast('Failed to print barcode label.', 'error');
    }
}

window.generateAutoSKU = generateAutoSKU;
window.downloadBarcodeImage = downloadBarcodeImage;
window.printBarcodeLabel = printBarcodeLabel;
window.autoFillSKU = function (catInputId, nameInputId, skuInputId) {
    const catVal = document.getElementById(catInputId)?.value || '';
    const nameVal = document.getElementById(nameInputId)?.value || '';
    const skuEl = document.getElementById(skuInputId);
    if (skuEl) {
        skuEl.value = generateAutoSKU(catVal, nameVal);
        if (typeof showToast === 'function') showToast('Barcode SKU auto-generated', 'info');
    }
};

export function renderAppearanceLanguageSettings() {
    const currentLang = (typeof window.getAppLanguage === 'function' ? window.getAppLanguage() : (localStorage.getItem('bms_lang') || 'en')).toLowerCase();
    const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('bms-theme') === 'dark';

    return `
    <div class="bg-gray-50/70 dark:bg-white/5 p-4 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-700/60 space-y-4">
        <div class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <i data-lucide="palette" class="w-5 h-5"></i>
            <h4 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">${window.t ? window.t('appearance_language', 'Appearance & Language') : 'Appearance & Language'}</h4>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Theme Selector -->
            <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200/70 dark:border-gray-700/70 shadow-2xs space-y-3">
                <div>
                    <p class="text-xs font-bold text-gray-900 dark:text-white">${window.t ? window.t('interface_theme', 'Interface Theme') : 'Interface Theme'}</p>
                    <p class="text-[11px] text-gray-400 dark:text-gray-500">${window.t ? window.t('theme_description', 'Choose between Light and Dark mode') : 'Choose between Light and Dark mode'}</p>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" onclick="window.setTheme ? window.setTheme('light') : window.toggleTheme()" class="flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${!isDark ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-2xs' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}">
                        <i data-lucide="sun" class="w-4 h-4 text-amber-500"></i> Light Mode
                    </button>
                    <button type="button" onclick="window.setTheme ? window.setTheme('dark') : window.toggleTheme()" class="flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${isDark ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-2xs' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}">
                        <i data-lucide="moon" class="w-4 h-4 text-indigo-400"></i> Dark Mode
                    </button>
                </div>
            </div>

            <!-- Language Selector -->
            <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200/70 dark:border-gray-700/70 shadow-2xs space-y-3">
                <div>
                    <p class="text-xs font-bold text-gray-900 dark:text-white">${window.t ? window.t('system_language', 'System Language') : 'System Language'}</p>
                    <p class="text-[11px] text-gray-400 dark:text-gray-500">${window.t ? window.t('language_description', 'Select your preferred language') : 'Select your preferred language'}</p>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" onclick="window.setAppLanguage('en'); window.refreshActiveSettingsView?.();" class="flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${currentLang === 'en' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-2xs' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}">
                        <span class="font-mono text-[10px] font-black uppercase px-1 py-0.2 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">EN</span> English
                    </button>
                    <button type="button" onclick="window.setAppLanguage('sw'); window.refreshActiveSettingsView?.();" class="flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${currentLang === 'sw' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-2xs' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}">
                        <span class="font-mono text-[10px] font-black uppercase px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">SW</span> Kiswahili
                    </button>
                </div>
            </div>
        </div>
    </div>`;
}
window.renderAppearanceLanguageSettings = renderAppearanceLanguageSettings;

window.refreshActiveSettingsView = function() {
    if (window.state?.activeView === 'settings') {
        if (window.state?.role === 'owner' && typeof window.renderSettings === 'function') {
            window.renderSettings();
        } else if (window.state?.role === 'branch' && typeof window.renderBranchSettings === 'function') {
            window.renderBranchSettings();
        } else if (window.state?.role === 'sysadmin' && typeof window.renderAdminDashboardView === 'function') {
            window.renderAdminDashboardView('settings');
        }
        if (window.lucide) window.lucide.createIcons();
    }
};

export function toggleHeaderMoreMenu(e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    const menu = document.getElementById('headerMoreMenu');
    if (!menu) return;
    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
        menu.classList.remove('hidden');
        updateHeaderMoreMenuUi();
    } else {
        menu.classList.add('hidden');
    }
}
window.toggleHeaderMoreMenu = toggleHeaderMoreMenu;

export function updateHeaderMoreMenuUi() {
    const langLabel = document.getElementById('moreMenuLangLabel');
    if (langLabel) {
        const currLang = (typeof window.getAppLanguage === 'function' ? window.getAppLanguage() : (localStorage.getItem('bms_lang') || 'en')).toUpperCase();
        langLabel.textContent = currLang;
    }
    if (window.lucide) window.lucide.createIcons();
}
window.updateHeaderMoreMenuUi = updateHeaderMoreMenuUi;

// Auto-close header more menu on click outside or Escape key
if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('headerMoreMenu');
        const btn = document.getElementById('headerMoreBtn');
        if (menu && !menu.classList.contains('hidden')) {
            if (!menu.contains(e.target) && !btn?.contains(e.target)) {
                menu.classList.add('hidden');
            }
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const menu = document.getElementById('headerMoreMenu');
            if (menu) menu.classList.add('hidden');
        }
    });
}

export const MODULE_NAMES = {
    // Owner Modules
    overview: { name: 'Business Overview', icon: 'layout-dashboard', entity: 'Business Overview Information' },
    branches: { name: 'Branches & Network', icon: 'git-branch', entity: 'Branch Information' },
    tasks: { name: 'Tasks & Projects', icon: 'check-square', entity: 'Task & Project Information' },
    analytics: { name: 'Business Analytics', icon: 'bar-chart-3', entity: 'Analytics & Revenue Data' },
    staff: { name: 'Staff & HR', icon: 'users', entity: 'Staff Information' },
    suppliers: { name: 'Suppliers & POs', icon: 'truck', entity: 'Supplier & Purchase Order Data' },
    quotations: { name: 'Quotations', icon: 'file-text', entity: 'Quotation Records' },
    payroll: { name: 'Staff Payroll', icon: 'dollar-sign', entity: 'Staff Payroll Records' },
    goals: { name: 'Business Goals', icon: 'target', entity: 'Business Goals & Targets' },
    shifts: { name: 'Shift Schedules', icon: 'calendar', entity: 'Staff Shift Schedules' },
    announcements: { name: 'Announcements', icon: 'megaphone', entity: 'Company Announcements' },
    promotions: { name: 'Promotions & Discounts', icon: 'tag', entity: 'Promotional Campaigns' },
    audit: { name: 'System Audit Logs', icon: 'shield-check', entity: 'System Audit Logs' },
    central_inventory: { name: 'Central Inventory', icon: 'boxes', entity: 'Central Inventory Catalog' },
    stock_movements: { name: 'Stock Movement Ledger', icon: 'arrow-left-right', entity: 'Stock Movement History' },
    central_dispatch: { name: 'Central Dispatch Hub', icon: 'send', entity: 'Dispatch Information' },
    central_restock: { name: 'Restock Central Inventory', icon: 'package-plus', entity: 'Restock Shipment Records' },
    financial_reports: { name: 'Reports & Statements', icon: 'pie-chart', entity: 'Financial & Business Reports' },
    capital: { name: 'Capital & Balance Sheet', icon: 'wallet', entity: 'Monetary Capital & Balance Sheet' },
    assets: { name: 'Fixed Assets & Maintenance', icon: 'box', entity: 'Fixed Business Assets & Maintenance' },
    business_loans: { name: 'Liabilities & Loans', icon: 'landmark', entity: 'Business Loans & Liabilities' },
    requests: { name: 'Branch Requests', icon: 'inbox', entity: 'Branch Requisitions' },
    chat: { name: 'Team Chat', icon: 'message-square', entity: 'Team Messages' },
    settings: { name: 'Settings & Security', icon: 'settings', entity: 'Account & Business Settings' },
    billing: { name: 'Subscription & Billing', icon: 'credit-card', entity: 'Billing & Subscription Information' },
    security: { name: 'Security & Access', icon: 'lock', entity: 'Security Settings' },

    // Branch Modules
    dashboard: { name: 'Branch Dashboard', icon: 'layout-dashboard', entity: 'Branch Dashboard Metrics' },
    sales: { name: 'Sales & POS', icon: 'shopping-cart', entity: 'Sales & POS Records' },
    expenses: { name: 'Branch Expenses', icon: 'receipt', entity: 'Branch Expense Records' },
    inventory: { name: 'Branch Inventory', icon: 'package', entity: 'Inventory & Stock Information' },
    customers: { name: 'Customers', icon: 'user-check', entity: 'Customer Directory' },
    notes: { name: 'Quick Notes', icon: 'sticky-note', entity: 'Branch Notes & Records' },
    loans: { name: 'Credit & Loans', icon: 'landmark', entity: 'Customer Credit & Loan Records' },
    reports: { name: 'Branch Reports', icon: 'trending-up', entity: 'Branch Performance Reports' },
    invoices: { name: 'Invoices', icon: 'file-spreadsheet', entity: 'Invoices & Receipts' },
    cash_drawer: { name: 'Cash Drawer & Till', icon: 'coins', entity: 'Till & Cash Drawer Sessions' },
    attendance: { name: 'Staff Attendance', icon: 'clock', entity: 'Staff Attendance Records' },
    returns: { name: 'Product Returns', icon: 'package-open', entity: 'Product Return Records' },
    shift_summary: { name: 'Shift Summary', icon: 'clipboard-list', entity: 'Shift Summaries' },
    loyalty: { name: 'Loyalty Program', icon: 'award', entity: 'Customer Loyalty Data' },
    stock_transfers: { name: 'Stock Transfers', icon: 'truck', entity: 'Stock Transfer Orders' },
};

/**
 * Render an informative, friendly offline placeholder for any module.
 */
export function renderModuleOfflineState({
    viewId = '',
    title = '',
    entityName = '',
    icon = 'wifi-off',
    retryAction = '',
    isOffline = !navigator.onLine
} = {}) {
    const meta = MODULE_NAMES[viewId] || {};
    const displayTitle = title || meta.name || 'Information';
    const displayEntity = entityName || meta.entity || displayTitle;
    const displayIcon = icon !== 'wifi-off' ? icon : (meta.icon || 'wifi-off');
    const retryCmd = retryAction || (viewId ? `switchView('${viewId}')` : 'window.location.reload()');

    const offlineText = isOffline
        ? `Couldn't load ${displayEntity} since you are currently offline. Please check your internet connection.`
        : `Couldn't load ${displayEntity} due to a network connection issue. Your local data remains safe.`;

    const statusBadge = isOffline
        ? `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50"><i data-lucide="wifi-off" class="w-3.5 h-3.5"></i> Offline Mode</span>`
        : `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50"><i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Network Interrupted</span>`;

    return `
    <div class="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center select-none slide-in">
        <div class="relative mb-5">
            <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm">
                <i data-lucide="${displayIcon}" class="w-8 h-8 sm:w-10 sm:h-10"></i>
            </div>
            <div class="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-white dark:bg-[#151c24] border border-amber-200 dark:border-amber-800 text-amber-500 flex items-center justify-center shadow-sm">
                <i data-lucide="wifi-off" class="w-3.5 h-3.5"></i>
            </div>
        </div>

        <div class="mb-3">${statusBadge}</div>

        <h3 class="text-base sm:text-xl font-bold text-gray-900 dark:text-white mb-2 max-w-md">
            Couldn't Load ${displayTitle}
        </h3>
        
        <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6 leading-relaxed">
            ${offlineText}
        </p>

        <div class="flex flex-wrap items-center justify-center gap-3">
            <button type="button" onclick="${retryCmd}" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer">
                <i data-lucide="rotate-cw" class="w-4 h-4"></i>
                <span>Retry Loading</span>
            </button>
            <button type="button" onclick="window.location.reload(true)" class="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer">
                <i data-lucide="refresh-ccw" class="w-4 h-4"></i>
                <span>Reload Page</span>
            </button>
        </div>
    </div>`;
}

export function renderOfflineViewPlaceholder(viewId, role, isOffline = !navigator.onLine, errorMsg = '') {
    return renderModuleOfflineState({
        viewId,
        isOffline,
        retryAction: `if (window.clearViewModuleErrors) window.clearViewModuleErrors(); switchView('${viewId}')`
    });
}

window.MODULE_NAMES = MODULE_NAMES;
window.renderModuleOfflineState = renderModuleOfflineState;
export function formatReportDisplayDate(dateStr) {
    if (!dateStr) return 'Select Date';
    try {
        const parts = String(dateStr).split('-');
        if (parts.length === 3) {
            const year = parts[0];
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            if (months[month - 1]) {
                return `${months[month - 1]} ${day}, ${year}`;
            }
        }
    } catch (e) {}
    return String(dateStr);
}

export function renderPremiumDatePicker({ id, selectedValue, onChange = '', classes = '', placeholder = 'Select Date', required = false, min = '', max = '' }) {
    const formattedDate = formatReportDisplayDate(selectedValue) || placeholder;
    const onChangeAttr = onChange ? ` data-onchange="${String(onChange).replace(/"/g, '&quot;')}"` : '';
    const minAttr = min ? ` data-min="${min}"` : '';
    const maxAttr = max ? ` data-max="${max}"` : '';
    const reqAttr = required ? ' required' : '';

    return `
        <div class="relative premium-dropdown-container w-full" id="container-${id}">
            <button type="button" class="form-input flex justify-between items-center pr-10 font-bold ${classes.includes('rounded-') ? '' : 'rounded-full'} ${classes}"
                    onclick="window.toggleCustomCalendarPicker('${id}')">
                <div class="flex items-center gap-2 min-w-0 pointer-events-none">
                    <i data-lucide="calendar" class="w-4 h-4 text-indigo-500 shrink-0"></i>
                    <span class="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 truncate" id="label-${id}">${formattedDate}</span>
                </div>
                <input type="hidden" id="${id}" value="${selectedValue || ''}"${onChangeAttr}${minAttr}${maxAttr}${reqAttr}>
                <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <i data-lucide="chevron-down" class="w-4 h-4"></i>
                </div>
            </button>
            <div id="list-${id}" class="dropdown-premium-list fixed z-[9999] hidden flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md p-3 w-[270px] sm:w-[290px] animate-in fade-in duration-150">
            </div>
        </div>
    `;
}

window.formatReportDisplayDate = formatReportDisplayDate;
window.renderPremiumDatePicker = renderPremiumDatePicker;

window.toTitleCase = function(str) {
    if (!str) return '';
    return str.replace(/\b\w/g, c => c.toUpperCase());
};

window.formatPhoneTZ = function(val) {
    if (!val) return '';
    let str = val.trim();
    if (/^0\d*/.test(str)) {
        str = '+255' + str.slice(1);
    }
    const digits = str.replace(/\D/g, '');
    if (digits.startsWith('255')) {
        const rest = digits.slice(3);
        const chunks = [];
        for (let i = 0; i < rest.length; i += 3) {
            chunks.push(rest.slice(i, i + 3));
        }
        return '+255' + (chunks.length > 0 ? ' ' + chunks.join(' ') : '');
    } else if (digits.length > 0) {
        const chunks = [];
        for (let i = 0; i < digits.length; i += 3) {
            chunks.push(digits.slice(i, i + 3));
        }
        return (str.startsWith('+') ? '+' : '') + chunks.join(' ');
    }
    return str;
};



