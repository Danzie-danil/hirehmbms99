import { supabase as supabaseClient } from '../supabase.js';
import { state } from '../state.js';
import { dbBranches } from '../db.js';
import { fmt, renderPremiumLoader, showToast, confirmModal, renderModuleOfflineState } from '../utils.js';

export async function renderGoalsModule() {
    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return;

    const container = document.getElementById('mainContent');
    if (!container) return;

    container.classList.remove('overflow-hidden', '!p-0');
    container.innerHTML = renderPremiumLoader('Loading business goals...');
    if (window.lucide) window.lucide.createIcons();

    try {
        const branches = await dbBranches.fetchAll(ownerId);
        const branchIds = (branches || []).map(b => b.id);
        const currentMonth = new Date().toISOString().slice(0, 7);

        const { data: goals, error } = await supabaseClient
            .from('goals')
            .select('*, branches(name)')
            .eq('owner_id', ownerId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const [salesRes, tasksRes, customersRes] = await Promise.all([
            branchIds.length ? supabaseClient.from('sales').select('amount, branch_id').in('branch_id', branchIds).gte('created_at', currentMonth + '-01') : { data: [] },
            branchIds.length ? supabaseClient.from('tasks').select('status, branch_id').in('branch_id', branchIds) : { data: [] },
            branchIds.length ? supabaseClient.from('customers').select('id, branch_id').in('branch_id', branchIds) : { data: [] }
        ]);

        const salesByBranch = {};
        (salesRes.data || []).forEach(s => {
            salesByBranch[s.branch_id] = (salesByBranch[s.branch_id] || 0) + Number(s.amount || 0);
        });

        const tasksByBranch = {};
        (tasksRes.data || []).forEach(t => {
            if (!tasksByBranch[t.branch_id]) tasksByBranch[t.branch_id] = { total: 0, done: 0 };
            tasksByBranch[t.branch_id].total++;
            if (t.status === 'completed') tasksByBranch[t.branch_id].done++;
        });

        const customersByBranch = {};
        (customersRes.data || []).forEach(c => {
            customersByBranch[c.branch_id] = (customersByBranch[c.branch_id] || 0) + 1;
        });

        function computeActual(goal) {
            const bId = goal.branch_id;
            if (goal.metric === 'revenue') return bId ? (salesByBranch[bId] || 0) : Object.values(salesByBranch).reduce((a, b) => a + b, 0);
            if (goal.metric === 'customers') return bId ? (customersByBranch[bId] || 0) : Object.values(customersByBranch).reduce((a, b) => a + b, 0);
            if (goal.metric === 'tasks') {
                const td = bId ? tasksByBranch[bId] : Object.values(tasksByBranch).reduce((a, b) => ({ total: a.total + b.total, done: a.done + b.done }), { total: 0, done: 0 });
                return td ? (td.total > 0 ? Math.round(td.done / td.total * 100) : 0) : 0;
            }
            return 0;
        }

        container.innerHTML = `
        <div class="space-y-5 slide-in max-w-7xl mx-auto pb-8">
            <!-- Header Section -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0 shadow-xs">
                        <i data-lucide="target" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h2 class="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">Goals & Performance KPIs</h2>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 border border-amber-100 dark:border-amber-800/50">
                                ${(goals || []).length} Active Targets
                            </span>
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Set monthly revenue benchmarks, task completion targets, and customer acquisition goals</p>
                    </div>
                </div>
                <button onclick="renderAddGoalView()" class="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0">
                    <i data-lucide="plus-circle" class="w-4 h-4"></i>
                    <span>Set New Goal</span>
                </button>
            </div>

            <!-- Goals Grid -->
            ${(goals || []).length === 0 ? `
            <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs py-20 text-center">
                <div class="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto mb-3">
                    <i data-lucide="target" class="w-7 h-7"></i>
                </div>
                <h3 class="text-base font-bold text-gray-900 dark:text-white">No business goals configured</h3>
                <p class="text-xs text-gray-400 mt-1 max-w-sm mx-auto">Set revenue and operational milestones to align your team</p>
            </div>` : `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${goals.map(g => {
                    const actual = computeActual(g);
                    const pct = Math.min(g.target > 0 ? Math.round(actual / g.target * 100) : 0, 100);
                    const isRevenue = g.metric === 'revenue';
                    const displayActual = isRevenue ? fmt.currency(actual) : (g.metric === 'tasks' ? actual + '%' : actual);
                    const displayTarget = isRevenue ? fmt.currency(g.target) : (g.metric === 'tasks' ? g.target + '%' : g.target);
                    const progressColor = pct >= 100 ? 'bg-emerald-500' : (pct >= 70 ? 'bg-amber-500' : 'bg-indigo-600');
                    const textPill = pct >= 100
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        : (pct >= 70
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                            : 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300');

                    const metricIcon = { revenue: 'trending-up', tasks: 'check-square', customers: 'users', custom: 'target' }[g.metric] || 'target';

                    return `
                    <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-800 p-4 sm:p-5 flex flex-col justify-between">
                        <div>
                            <div class="flex items-start justify-between gap-3 mb-3">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                        <i data-lucide="${metricIcon}" class="w-5 h-5"></i>
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-sm text-gray-900 dark:text-white leading-snug">${g.title}</h4>
                                        <p class="text-[11px] text-gray-400 mt-0.5">${g.branches?.name || 'All Branches'} • ${g.month || 'Current Month'}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2 shrink-0">
                                    <span class="px-2.5 py-1 rounded-xl text-xs font-black ${textPill}">
                                        ${pct}%
                                    </span>
                                    <button onclick="deleteGoal('${g.id}')" class="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" title="Delete Goal">
                                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 my-3.5 overflow-hidden">
                                <div class="${progressColor} h-2.5 rounded-full transition-all duration-500" style="width:${pct}%"></div>
                            </div>

                            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
                                <span>Current: <strong class="text-gray-900 dark:text-white">${displayActual}</strong></span>
                                <span>Target: <strong class="text-gray-900 dark:text-white">${displayTarget}</strong></span>
                            </div>
                        </div>

                        ${g.description ? `<p class="text-[11px] text-gray-400 italic mt-3 pt-2.5 border-t border-gray-50 dark:border-gray-800/80 leading-relaxed">${g.description}</p>` : ''}
                    </div>`;
                }).join('')}
            </div>`}
        </div>`;

        if (window.lucide) window.lucide.createIcons();

    } catch (err) {
        console.error('[OwnerGoals] Error loading goals:', err);
        if (container) {
            container.innerHTML = renderModuleOfflineState({
                viewId: 'goals',
                title: 'Business Goals',
                entityName: 'Business Goals & Targets',
                retryAction: 'window.renderGoalsModule()'
            });
            if (window.lucide) window.lucide.createIcons();
        }
    }
}

// ── STANDARD MODAL/PAGE VIEW CONTAINER MATCHING ASSIGN NEW TASK ────────────────
export async function renderAddGoalView() {
    const container = document.getElementById('mainContent');
    if (!container) return;

    container.classList.add('overflow-hidden', '!p-0');

    const branches = state.branches || (await dbBranches.fetchAll(state.ownerId)) || [];
    const currentMonth = new Date().toISOString().slice(0, 7);

    container.innerHTML = `
    <div class="flex flex-col h-full bg-slate-50/50 dark:bg-gray-900 overflow-hidden">
        <!-- Top Nav Header -->
        <div class="modal-top-nav flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none">
            <button type="button" onclick="renderGoalsModule()" class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200 dark:border-gray-700">
                <i data-lucide="chevron-left" class="w-4 h-4"></i>
                <span>${window.t('btn_close', 'Close')}</span>
            </button>
            <div class="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-base shrink-0 border border-gray-200/80 dark:border-gray-700">
                <i data-lucide="target" class="w-4 h-4"></i>
            </div>
            <div>
                <h3 class="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">Set New KPI Goal</h3>
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Define milestone targets for branches</p>
            </div>
        </div>

        <!-- Form Body Container -->
        <form onsubmit="event.preventDefault(); submitGoal();" class="flex flex-col flex-1 overflow-hidden">
            <div class="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-4 scroller-custom">
                <div class="bg-white dark:bg-gray-800/90 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
                    <div>
                        <label for="goalBranch" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('assign_to_branch', 'Branch Scope')}</label>
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'goalBranch',
                            selectedValue: '',
                            searchable: branches.length > 4,
                            options: [
                                { value: '', label: 'All Branches', icon: 'layers' },
                                ...branches.map(b => ({ value: b.id, label: b.name, icon: 'map-pin' }))
                            ]
                        }) : ''}
                    </div>

                    <div>
                        <label for="goalTitle" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Goal Title *</label>
                        <input type="text" id="goalTitle" required class="form-input w-full" placeholder="e.g. Monthly Branch Revenue Milestone">
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label for="goalMetric" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">KPI Metric *</label>
                            ${window.renderPremiumSelect ? window.renderPremiumSelect({
                                id: 'goalMetric',
                                selectedValue: 'revenue',
                                searchable: false,
                                options: [
                                    { value: 'revenue', label: 'Revenue (TZS)', icon: 'trending-up' },
                                    { value: 'customers', label: 'New Customers Count', icon: 'users' },
                                    { value: 'tasks', label: 'Task Completion (%)', icon: 'check-square' }
                                ]
                            }) : ''}
                        </div>
                        <div>
                            <label for="goalTarget" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Target Value *</label>
                            <input type="number" id="goalTarget" required class="form-input w-full font-black text-amber-600 dark:text-amber-400" placeholder="0" min="0">
                        </div>
                    </div>

                    <div>
                        <label for="goalMonth" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Period Month *</label>
                        <input type="month" id="goalMonth" required class="form-input w-full" value="${currentMonth}">
                    </div>

                    <div>
                        <label for="goalDescription" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Description / Milestone Incentives (Optional)</label>
                        <textarea id="goalDescription" rows="3" class="form-input w-full" placeholder="Add milestone context or reward details..."></textarea>
                    </div>
                </div>
            </div>

            <!-- Bottom Action Nav Footer -->
            <div class="modal-bottom-nav flex-none p-3.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                <button type="button" onclick="renderGoalsModule()" class="px-6 py-2 rounded-full font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all cursor-pointer">
                    ${window.t('btn_cancel', 'Cancel')}
                </button>
                <button type="submit" class="px-6 py-2 bg-[#2c3e50] hover:bg-[#1a252f] text-white rounded-full font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2">
                    <span>Set Goal</span>
                </button>
            </div>
        </form>
    </div>`;

    if (window.lucide) window.lucide.createIcons();
}

window.renderGoalsModule = renderGoalsModule;
window.renderAddGoalView = renderAddGoalView;
window.openGoalModal = renderAddGoalView;

window.submitGoal = async function () {
    const title = document.getElementById('goalTitle')?.value?.trim();
    const branchId = document.getElementById('goalBranch')?.value || null;
    const metric = document.getElementById('goalMetric')?.value || 'revenue';
    const target = parseFloat(document.getElementById('goalTarget')?.value || '0');
    const month = document.getElementById('goalMonth')?.value;
    const description = document.getElementById('goalDescription')?.value?.trim();

    if (!title || !target) {
        showToast('Title and target are required', 'error');
        return;
    }

    try {
        const { error } = await supabaseClient.from('goals').insert({
            owner_id: state.ownerId,
            branch_id: branchId || null,
            title,
            metric,
            target,
            month,
            description,
            period: 'monthly'
        });
        if (error) throw error;

        showToast('Goal target successfully created!', 'success');
        renderGoalsModule();
    } catch (err) {
        showToast('Failed to set goal: ' + err.message, 'error');
    }
};

window.deleteGoal = async function (id) {
    const ok = await confirmModal('Delete Goal', 'Are you sure you want to delete this goal milestone?', 'Delete', 'Cancel');
    if (!ok) return;

    try {
        await supabaseClient.from('goals').delete().eq('id', id);
        showToast('Goal milestone removed', 'info');
        renderGoalsModule();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};
