import { state } from './state.js';
import { dbSales, dbExpenses, dbInventory, dbNotes, dbCustomers, dbLoans, dbSuppliers, dbStaff, dbPurchaseOrders, dbQuotations, dbTasks, dbTaskComments, dbBranches } from './db.js';

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
            case 'inventory': data = await dbInventory.fetchOne(id); break;
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
            case 'branch': data = state.branches ? state.branches.find(b => b.id === id) : await dbBranches.fetchOne(id); break;
        }
        if (data) openModal(type + 'Details', data);
    } catch (err) {
        showToast('Failed to load details: ' + err.message, 'error');
    }
};

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
        return symbol + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    },
    number: (n) => {
        return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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

        const isNumeric = /(amount|price|cost|salary|qty|quantity|stock_qty|threshold|unit_price|profit|wage|commission|hourly_rate)/i.test(text);

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

export function openModal(type, data = null, bypassHistory = false) {
    let html = null;
    if (typeof type === 'string' && type.trim().startsWith('<')) {
        html = type;
    } else if (window.getModalHTML) {
        html = window.getModalHTML(type, data);
    }

    if (!html) return;

    if (!bypassHistory) {
        const historyItem = {
            type: state._currentModalType ? 'modal' : 'view',
            viewId: state.activeView || null,
            context: state.activeViewContext || null,
            modalType: state._currentModalType || null,
            modalData: state._currentModalData || null
        };
        if (!state._modalHistory) state._modalHistory = [];
        state._modalHistory.push(historyItem);
    }

    state._currentModalType = typeof type === 'string' && !type.trim().startsWith('<') ? type : 'custom_raw';
    state._currentModalData = data;

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
}

export function closeModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) modalOverlay.classList.add('hidden');
    const modalContent = document.getElementById('modalContent');
    if (modalContent) modalContent.innerHTML = '';

    if (state._modalHistory && state._modalHistory.length > 0) {
        const prev = state._modalHistory.pop();
        if (prev.type === 'modal') {
            openModal(prev.modalType, prev.modalData, true);
        } else if (prev.viewId) {
            state._currentModalType = null;
            state._currentModalData = null;
            if (window.switchView) {
                window.switchView(prev.viewId, prev.context, true);
            }
        }
    } else {
        state._currentModalType = null;
        state._currentModalData = null;
        const defaultView = state.role === 'owner' ? 'overview' : (state.role === 'branch' ? 'dashboard' : 'overview');
        if (window.switchView) {
            window.switchView(defaultView, null, true);
        }
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
            <h2 class="update-text" id="update-status-text">Updating your system...</h2>
            <p class="update-subtext" id="update-sub-text">Fetching latest changes and optimizing.</p>
        `;
        document.body.appendChild(overlay);
        lucide.createIcons();

        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                await registration.unregister();
            }
        }

        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
        }

        await new Promise(resolve => setTimeout(resolve, 2000));

        const statusText = document.getElementById('update-status-text');
        const subText = document.getElementById('update-sub-text');
        const iconWrapper = overlay.querySelector('.update-icon-wrapper');

        if (statusText && subText && iconWrapper) {
            iconWrapper.innerHTML = `<i data-lucide="thumbs-up" class="success-check w-20 h-20"></i>`;
            statusText.textContent = "System Updated!";
            subText.textContent = "Your workspace is now up to date.";
            lucide.createIcons();
        }

        await new Promise(resolve => setTimeout(resolve, 1200));

        window.location.reload(true);
    } catch (err) {
        console.error('Update failed:', err);
        window.location.reload(true);
    }
};

export async function clearAllCache() {
    if (typeof showLoader === 'function') showLoader('Clearing All Application Cache...');
    try {
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
        }

        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
        }

        try {
            sessionStorage.clear();
            const keysToKeep = ['sb-auth-token', 'supabase.auth.token'];
            const savedItems = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && keysToKeep.some(k => key.includes(k))) {
                    savedItems[key] = localStorage.getItem(key);
                }
            }
            localStorage.clear();
            Object.keys(savedItems).forEach(k => localStorage.setItem(k, savedItems[k]));
        } catch (e) {
            console.warn('[Cache] Storage clear warning:', e);
        }

        if (typeof showToast === 'function') showToast('Cache cleared successfully! Reloading...', 'success');
        setTimeout(() => {
            window.location.reload(true);
        }, 1000);
    } catch (err) {
        console.error('[Cache] Clear error:', err);
        if (typeof showToast === 'function') showToast('Cache cleared! Reloading...', 'info');
        setTimeout(() => window.location.reload(true), 1000);
    } finally {
        if (typeof hideLoader === 'function') hideLoader();
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

export function downloadCSVTemplate(fileName, headers, instructions = [], sampleRows = []) {
    const hasInstructions = instructions && instructions.length > 0;
    const allHeaders = [...headers];
    if (hasInstructions) {
        allHeaders.push('', ''); // 2 blank spacer columns
        allHeaders.push('INSTRUCTIONS_DO_NOT_DELETE_OR_MODIFY');
    }

    let csv = allHeaders.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',') + '\n';

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
        csv += rowVals.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
};

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
            if (typeof window.XLSX === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
                script.onload = processExcel;
                script.onerror = () => {
                    if (window.showToast) window.showToast('Failed to load Excel parser engine', 'error');
                };
                document.head.appendChild(script);
            } else {
                processExcel();
            }
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

export async function ensurePdfLibraries() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load jsPDF library'));
            document.head.appendChild(script);
        });
    }
    if (!window.jspdf?.jsPDF?.API?.autoTable) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load jsPDF AutoTable plugin'));
            document.head.appendChild(script);
        });
    }
    return window.jspdf;
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
    if (btn) {
        const icon = btn.querySelector('i, svg');
        if (icon) icon.classList.add('animate-spin');
    }
    showLoader('Just a moment...');
    setTimeout(() => {
        window.location.reload();
    }, 120);
};

if (typeof window !== 'undefined') {
    window.triggerAppRefresh = triggerAppRefresh;
    window.showLoader = showLoader;
    window.hideLoader = hideLoader;
}

export function renderPremiumLoader(message = "Loading...") {
    return `
    <div class="flex flex-col items-center justify-center py-16 w-full">
        <img src="/loading.gif" alt="Loading..." class="w-16 h-16 sm:w-20 sm:h-20 object-contain mx-auto" />
        <p class="loader-text mt-3 text-center flex items-center justify-center">${formatLoaderDots(message)}</p>
    </div>`;
};

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
        const canvas = document.createElement('canvas');
        if (typeof JsBarcode === 'undefined') {
            if (typeof showToast === 'function') showToast('JsBarcode library not loaded.', 'error');
            return;
        }

        JsBarcode(canvas, sku, {
            format: 'CODE128',
            width: 2,
            height: 80,
            displayValue: true,
            fontSize: 16,
            font: 'monospace',
            margin: 15,
            background: '#ffffff',
            lineColor: '#000000'
        });

        const cleanName = String(productName).toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 20);
        const fileName = `${sku}_${cleanName || 'barcode'}.png`;

        const link = document.createElement('a');
        link.download = fileName;
        link.href = canvas.toDataURL('image/png');
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

window.generateAutoSKU = generateAutoSKU;
window.downloadBarcodeImage = downloadBarcodeImage;
window.autoFillSKU = function (catInputId, nameInputId, skuInputId) {
    const catVal = document.getElementById(catInputId)?.value || '';
    const nameVal = document.getElementById(nameInputId)?.value || '';
    const skuEl = document.getElementById(skuInputId);
    if (skuEl) {
        skuEl.value = generateAutoSKU(catVal, nameVal);
        if (typeof showToast === 'function') showToast('Barcode SKU auto-generated', 'info');
    }
};

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



