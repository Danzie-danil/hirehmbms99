
import { state } from '../state.js';
import { dbBranches, dbAudit } from '../db.js';
import { renderPremiumLoader, fmt, renderModuleOfflineState } from '../utils.js';

export async function renderAuditModule() {
    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return;

    const container = document.getElementById('mainContent');
    if (!container) return;

    container.innerHTML = renderPremiumLoader('Loading audit logs...');
    if (window.lucide) window.lucide.createIcons();

    try {
        const branches = await dbBranches.fetchAll(ownerId);
        const bIds = branches.map(b => b.id);
        const targetBIds = bIds.length ? bIds : ['00000000-0000-0000-0000-000000000000'];
        const since = new Date(Date.now() - 30 * 86400000).toISOString();

        const savedBranch = state._auditBranchFilter || 'all';
        const savedType = state._auditTypeFilter || 'all';

        const auditData = await dbAudit.fetchAuditTrail({ ownerId, targetBIds, since });

        const branchMap = Object.fromEntries(branches.map(b => [b.id, b.name]));

        let events = [
            ...(auditData.sales || []).map(s => ({ id: s.id, time: s.created_at, type: 'sale', branchId: s.branch_id, label: `Sale recorded — ${fmt.currency(s.amount)} (${s.payment || s.payment_method || 'cash'})`, icon: 'shopping-cart', color: 'bg-emerald-100 text-emerald-600' })),
            ...(auditData.expenses || []).map(e => ({ id: e.id, time: e.created_at, type: 'expense', branchId: e.branch_id, label: `Expense: ${e.description || e.category} — ${fmt.currency(e.amount)}`, icon: 'credit-card', color: 'bg-red-100 text-red-600' })),
            ...(auditData.tasks || []).map(t => ({ id: t.id, time: t.created_at, type: 'task', branchId: t.branch_id, label: `Task ${t.status}: "${t.title}"`, icon: 'check-square', color: 'bg-blue-100 text-blue-600' })),
            ...(auditData.requests || []).map(r => ({ id: r.id, time: r.created_at, type: 'request', branchId: null, label: `Request: ${r.subject} (${r.status})`, icon: 'shield-check', color: 'bg-purple-100 text-purple-600' }))
        ];


        events.sort((a, b) => new Date(b.time) - new Date(a.time));

        if (savedBranch !== 'all') events = events.filter(e => e.branchId === savedBranch);
        if (savedType !== 'all') events = events.filter(e => e.type === savedType);

        container.innerHTML = `
        <div class="space-y-3 sm:space-y-4 slide-in">
            <div class="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                <div class="inline-flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm rounded-2xl p-1 pr-3 sm:pr-4">
                    <div class="bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 px-2.5 sm:px-3.5 py-1 rounded-xl text-[10px] sm:text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                        <i data-lucide="scroll-text" class="w-3.5 h-3.5 text-indigo-500"></i> Audit Logs
                    </div>
                    <span class="text-[10px] sm:text-xs text-gray-400 font-medium">Last 30 days</span>
                </div>
                <div class="flex items-center gap-1.5 sm:gap-2">
                    ${window.renderPremiumSelect({
            id: 'auditBranchFilter',
            selectedValue: savedBranch,
            searchable: branches.length > 4,
            classes: 'w-28 sm:w-36 text-xs',
            options: [
                { value: 'all', label: 'All Branches', icon: 'layers' },
                ...branches.map(b => ({ value: b.id, label: b.name, icon: 'map-pin' }))
            ]
        })}
                    ${window.renderPremiumSelect({
            id: 'auditTypeFilter',
            selectedValue: savedType,
            searchable: false,
            classes: 'w-28 sm:w-32 text-xs',
            options: [
                { value: 'all', label: 'All Types', icon: 'filter' },
                { value: 'sale', label: 'Sales', icon: 'shopping-cart' },
                { value: 'expense', label: 'Expenses', icon: 'credit-card' },
                { value: 'task', label: 'Tasks', icon: 'check-square' },
                { value: 'request', label: 'Requests', icon: 'shield-check' }
            ]
        })}
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                ${events.length === 0 ? `
                <div class="py-14 sm:py-20 text-center text-gray-400">
                    <i data-lucide="scroll-text" class="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-20"></i>
                    <p class="text-xs sm:text-sm font-medium">No activity found</p>
                    <p class="text-[11px] sm:text-xs mt-0.5">Try changing your filters</p>
                </div>` : `
                <div class="divide-y divide-gray-100/70 dark:divide-gray-700/40">
                    ${events.slice(0, 100).map(e => `
                    <div class="flex items-center gap-2.5 sm:gap-3.5 px-3 sm:px-4 py-2 sm:py-2.5 hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors">
                        <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl ${e.color} flex items-center justify-center shrink-0">
                            <i data-lucide="${e.icon}" class="w-3.5 h-3.5"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-snug">${e.label}</p>
                            <div class="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-xs text-gray-400 font-medium">
                                ${e.branchId ? `<span class="font-bold text-gray-500 dark:text-gray-400 truncate max-w-[90px] sm:max-w-none">${branchMap[e.branchId] || 'Branch'}</span><span>•</span>` : ''}
                                <span>${fmt.dateTime(e.time)}</span>
                            </div>
                        </div>
                        <span class="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 shrink-0 border border-gray-200/50 dark:border-gray-600/50">${e.type}</span>
                    </div>`).join('')}
                </div>`}
            </div>
        </div>`;
        lucide.createIcons();

        document.getElementById('auditBranchFilter')?.addEventListener('change', (e) => {
            state._auditBranchFilter = e.target.value;
            renderAuditModule();
        });
        document.getElementById('auditTypeFilter')?.addEventListener('change', (e) => {
            state._auditTypeFilter = e.target.value;
            renderAuditModule();
        });

    } catch (err) {
        console.error('[OwnerAudit] Error loading audit logs:', err);
        const container = document.getElementById('mainContent');
        if (container) {
            container.innerHTML = renderModuleOfflineState({
                viewId: 'audit',
                title: 'System Audit Logs',
                entityName: 'System Audit Logs',
                retryAction: 'window.renderAuditModule()'
            });
            if (window.lucide) window.lucide.createIcons();
        }
    }
};
