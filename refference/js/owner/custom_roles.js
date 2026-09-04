import { supabase } from '../supabase.js';
import { state } from '../state.js';
import { showToast, showLoader, hideLoader } from '../utils.js';

export const PERMISSION_KEYS = [
    { key: 'can_view_cost_prices', label: 'View Product Cost Prices & Margins', desc: 'Allows seeing wholesale cost and profit margins on sales & stock tables' },
    { key: 'can_apply_custom_discounts', label: 'Apply Custom POS Discounts', desc: 'Allows cashiers to grant custom percentage or fixed TZS discounts on checkout' },
    { key: 'can_approve_product_returns', label: 'Approve Customer Product Returns', desc: 'Allows accepting items back into inventory and issuing cash refunds' },
    { key: 'can_edit_inventory_stock', label: 'Edit & Adjust Stock Levels', desc: 'Allows manually adjusting stock quantities, batch numbers, and reorder points' },
    { key: 'can_export_financial_reports', label: 'Export Financial & Tax Reports', desc: 'Allows downloading P&L statements, VAT reports, and CSV audit logs' },
    { key: 'can_manage_suppliers', label: 'Create & Edit Supplier Contracts', desc: 'Allows adding new suppliers, updating payables, and logging purchase orders' }
];

export async function renderCustomRoleMatrix(containerId = 'mainContent') {
    const container = document.getElementById(containerId);
    if (!container) return;

    showLoader('Loading Custom Role Matrix...');
    const customRoles = await loadCustomRoles();
    hideLoader();

    let roleCardsHtml = '';
    if (customRoles.length === 0) {
        roleCardsHtml = `
        <div class="col-span-full p-8 text-center bg-gray-50 dark:bg-gray-800/40 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 flex items-center justify-center mx-auto">
                <i data-lucide="shield-plus" class="w-6 h-6"></i>
            </div>
            <h4 class="text-base font-bold text-gray-900 dark:text-white">No Custom Roles Configured</h4>
            <p class="text-xs text-gray-400 max-w-sm mx-auto">Standard roles (Owner, Manager, Cashier, Auditor) are currently active. Create custom roles to grant specific fine-grained permissions.</p>
            <button onclick="window.openCreateRoleModal()" class="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all">
                + Create First Custom Role
            </button>
        </div>
        `;
    } else {
        customRoles.forEach(r => {
            const activePermsCount = PERMISSION_KEYS.filter(p => r.permissions && r.permissions[p.key]).length;
            roleCardsHtml += `
            <div class="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-xs space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="text-base font-black text-gray-900 dark:text-white">${escapeHtml(r.role_name)}</h4>
                        <span class="text-[10px] font-mono text-gray-400 uppercase tracking-widest">${activePermsCount} / ${PERMISSION_KEYS.length} Permissions Active</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <button onclick="window.editCustomRole('${r.id}')" class="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Edit Role Matrix">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                        <button onclick="window.deleteCustomRole('${r.id}')" class="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Delete Custom Role">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
                <div class="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700/40">
                    ${PERMISSION_KEYS.map(p => `
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-gray-600 dark:text-gray-300 font-medium">${p.label}</span>
                            <span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${r.permissions && r.permissions[p.key] ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-gray-100 text-gray-400 dark:bg-gray-700'}">
                                ${r.permissions && r.permissions[p.key] ? 'ALLOWED' : 'DENIED'}
                            </span>
                        </div>
                    `).join('')}
                </div>
            </div>
            `;
        });
    }

    container.innerHTML = `
    <div class="space-y-6 md:space-y-8 slide-in w-full pb-12">
        <div class="flex items-center justify-between flex-wrap gap-4">
            <div>
                <h1 class="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">Custom Role & Permission Matrix</h1>
                <p class="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">Define Granular Permission Enforcements Per Staff Member</p>
            </div>
            <button onclick="window.openCreateRoleModal()" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2">
                <i data-lucide="plus-circle" class="w-4 h-4"></i> Create Custom Role
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${roleCardsHtml}
        </div>
    </div>
    `;

    if (window.lucide) window.lucide.createIcons();
}

async function loadCustomRoles() {
    try {
        const { data, error } = await supabase
            .from('sys_custom_roles')
            .select('*')
            .eq('owner_id', state.profile?.id);

        if (!error && data) return data;
    } catch (e) {}
    return state.customRoles || [];
}

export function openCreateRoleModal() {
    const modalHtml = `
    <div class="p-6 space-y-6 max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-3xl">
        <h3 class="text-lg font-black text-gray-900 dark:text-white">Create New Custom Staff Role</h3>
        <div class="space-y-4">
            <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Role Title</label>
                <input id="newRoleTitle" type="text" placeholder="e.g. Senior Inventory Auditor" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-semibold focus:outline-none focus:border-indigo-600">
            </div>
            <div class="space-y-3 pt-2">
                <label class="block text-xs font-bold uppercase tracking-wider text-gray-500">Fine-Grained Permissions</label>
                ${PERMISSION_KEYS.map(p => `
                    <label class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl cursor-pointer hover:bg-gray-100/70 transition-colors">
                        <input type="checkbox" id="perm_${p.key}" class="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300">
                        <div>
                            <div class="text-xs font-bold text-gray-900 dark:text-white">${p.label}</div>
                            <div class="text-[11px] text-gray-400 font-medium">${p.desc}</div>
                        </div>
                    </label>
                `).join('')}
            </div>
        </div>
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button onclick="window.closeModal()" class="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100">Cancel</button>
            <button onclick="window.saveNewCustomRole()" class="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700">Save Custom Role</button>
        </div>
    </div>
    `;

    const content = document.getElementById('modalContent');
    const overlay = document.getElementById('modalOverlay');
    if (content && overlay) {
        content.innerHTML = modalHtml;
        overlay.classList.remove('hidden');
    }
}

export async function saveNewCustomRole() {
    const titleInput = document.getElementById('newRoleTitle');
    const title = titleInput ? titleInput.value.trim() : '';
    if (!title) {
        showToast('Please enter a role title.', 'warning');
        return;
    }

    const perms = {};
    PERMISSION_KEYS.forEach(p => {
        const chk = document.getElementById(`perm_${p.key}`);
        perms[p.key] = chk ? chk.checked : false;
    });

    showLoader('Saving Custom Role Matrix...');
    try {
        const newRole = {
            id: 'role_' + Date.now(),
            owner_id: state.profile?.id,
            role_name: title,
            permissions: perms,
            created_at: new Date().toISOString()
        };

        if (!state.customRoles) state.customRoles = [];
        state.customRoles.push(newRole);

        await supabase.from('sys_custom_roles').insert({
            owner_id: state.profile?.id,
            role_name: title,
            permissions: perms
        }).catch(() => {});

        showToast(`Custom role [${title}] created successfully.`, 'success');
        if (typeof window.closeModal === 'function') window.closeModal();
        renderCustomRoleMatrix();
    } catch (err) {
        showToast('Failed to save role.', 'error');
    } finally {
        hideLoader();
    }
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

window.renderCustomRoleMatrix = renderCustomRoleMatrix;
window.openCreateRoleModal = openCreateRoleModal;
window.saveNewCustomRole = saveNewCustomRole;
