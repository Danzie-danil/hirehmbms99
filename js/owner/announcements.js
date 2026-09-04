import { state } from '../state.js';
import { dbBranches, dbAnnouncements } from '../db.js';
import { fmt, renderPremiumLoader, showToast, confirmModal, renderModuleOfflineState } from '../utils.js';

export async function renderAnnouncementsModule() {
    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return;

    const container = document.getElementById('mainContent');
    if (!container) return;

    container.classList.remove('overflow-hidden', '!p-0');
    container.innerHTML = renderPremiumLoader('Loading announcements...');
    if (window.lucide) window.lucide.createIcons();

    try {
        const [branches, announcements] = await Promise.all([
            dbBranches.fetchAll(ownerId),
            dbAnnouncements.fetchAll(ownerId)
        ]);


        const pinned = (announcements || []).filter(a => a.is_pinned);
        const others = (announcements || []).filter(a => !a.is_pinned);
        const sorted = [...pinned, ...others];

        const priorityStyles = {
            urgent: {
                bg: 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-800/60',
                badge: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800',
                icon: 'alert-circle',
                iconColor: 'text-red-600 dark:text-red-400',
                iconBg: 'bg-red-100 dark:bg-red-900/30'
            },
            normal: {
                bg: 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800',
                badge: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
                icon: 'bell',
                iconColor: 'text-orange-500',
                iconBg: 'bg-orange-50 dark:bg-orange-900/30'
            }
        };

        container.innerHTML = `
        <div class="space-y-5 slide-in max-w-7xl mx-auto pb-8">
            <!-- Header Section -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold shrink-0 shadow-xs">
                        <i data-lucide="megaphone" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h2 class="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">Internal Broadcast Announcements</h2>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-50 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 border border-orange-100 dark:border-orange-800/50">
                                ${(announcements || []).length} Broadcasts
                            </span>
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Post operational bulletins, urgent company notices, and branch memos</p>
                    </div>
                </div>
                <button onclick="renderAddAnnouncementView()" class="w-full sm:w-auto px-4 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0">
                    <i data-lucide="plus-circle" class="w-4 h-4"></i>
                    <span>New Announcement</span>
                </button>
            </div>

            <!-- Announcements Feed -->
            ${sorted.length === 0 ? `
            <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs py-20 text-center">
                <div class="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-500 flex items-center justify-center mx-auto mb-3">
                    <i data-lucide="megaphone" class="w-7 h-7"></i>
                </div>
                <h3 class="text-base font-bold text-gray-900 dark:text-white">No broadcast announcements</h3>
                <p class="text-xs text-gray-400 mt-1 max-w-sm mx-auto">Send internal memos to all or specific branch teams</p>
            </div>` : `
            <div class="space-y-3">
                ${sorted.map(a => {
                    const style = priorityStyles[a.priority] || priorityStyles.normal;
                    return `
                    <div class="rounded-2xl border ${style.bg} shadow-xs p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between">
                        ${a.is_pinned ? `<div class="absolute top-0 right-0 bg-amber-400 text-slate-900 text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-xs flex items-center gap-1"><i data-lucide="pin" class="w-3 h-3"></i> PINNED</div>` : ''}
                        <div class="flex items-start gap-3.5">
                            <div class="w-10 h-10 rounded-xl flex items-center justify-center ${style.iconBg} ${style.iconColor} shrink-0 mt-0.5">
                                <i data-lucide="${style.icon}" class="w-5 h-5"></i>
                            </div>
                            <div class="flex-1 min-w-0 pr-12">
                                <div class="flex items-center gap-2 flex-wrap mb-1">
                                    <h4 class="font-bold text-sm text-gray-900 dark:text-white leading-snug">${a.title}</h4>
                                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge} uppercase tracking-wider">${a.priority}</span>
                                </div>
                                <p class="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mt-1 whitespace-pre-line">${a.message}</p>
                                <div class="flex items-center gap-3 mt-3 text-[11px] text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800/60">
                                    <span class="flex items-center gap-1 font-medium text-gray-600 dark:text-gray-300">
                                        <i data-lucide="map-pin" class="w-3 h-3 text-gray-400"></i> ${a.branches?.name || 'All Branches'}
                                    </span>
                                    <span>•</span>
                                    <span>${fmt.dateTime ? fmt.dateTime(a.created_at) : new Date(a.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <button onclick="deleteAnnouncement('${a.id}')" class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors shrink-0" title="Delete Announcement">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>`;
                }).join('')}
            </div>`}
        </div>`;

        if (window.lucide) window.lucide.createIcons();

    } catch (err) {
        console.error('[OwnerAnnouncements] Error loading announcements:', err);
        if (container) {
            container.innerHTML = renderModuleOfflineState({
                viewId: 'announcements',
                title: 'Company Announcements',
                entityName: 'Company Announcements',
                retryAction: 'window.renderAnnouncementsModule()'
            });
            if (window.lucide) window.lucide.createIcons();
        }
    }
}

// ── STANDARD MODAL/PAGE VIEW CONTAINER MATCHING ASSIGN NEW TASK ────────────────
export async function renderAddAnnouncementView() {
    const container = document.getElementById('mainContent');
    if (!container) return;

    container.classList.add('overflow-hidden', '!p-0');

    const branches = state.branches || (await dbBranches.fetchAll(state.ownerId)) || [];

    container.innerHTML = `
    <div class="flex flex-col h-full bg-slate-50/50 dark:bg-gray-900 overflow-hidden">
        <!-- Top Nav Header -->
        <div class="modal-top-nav flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none">
            <button type="button" onclick="renderAnnouncementsModule()" class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200 dark:border-gray-700">
                <i data-lucide="chevron-left" class="w-4 h-4"></i>
                <span>${window.t('btn_close', 'Close')}</span>
            </button>
            <div class="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-base shrink-0 border border-gray-200/80 dark:border-gray-700">
                <i data-lucide="megaphone" class="w-4 h-4"></i>
            </div>
            <div>
                <h3 class="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">New Broadcast Announcement</h3>
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Send an internal notice to branch team members</p>
            </div>
        </div>

        <!-- Form Body Container -->
        <form onsubmit="event.preventDefault(); submitAnnouncement();" class="flex flex-col flex-1 overflow-hidden">
            <div class="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-4 scroller-custom">
                <div class="bg-white dark:bg-gray-800/90 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
                    <div>
                        <label for="annBranch" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('assign_to_branch', 'Target Audience')}</label>
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'annBranch',
                            selectedValue: '',
                            searchable: branches.length > 4,
                            options: [
                                { value: '', label: 'All Branches (Company-Wide)', icon: 'layers' },
                                ...branches.map(b => ({ value: b.id, label: b.name, icon: 'map-pin' }))
                            ]
                        }) : ''}
                    </div>

                    <div>
                        <label for="annTitle" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Announcement Subject *</label>
                        <input type="text" id="annTitle" required class="form-input w-full" placeholder="e.g. Mandatory Staff Meeting this Friday">
                    </div>

                    <div>
                        <label for="annPriority" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Priority Level *</label>
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'annPriority',
                            selectedValue: 'normal',
                            searchable: false,
                            options: [
                                { value: 'normal', label: 'Normal Bulletin', icon: 'bell' },
                                { value: 'urgent', label: 'Urgent Attention Required', icon: 'alert-circle' }
                            ]
                        }) : ''}
                    </div>

                    <div>
                        <label for="annMessage" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Announcement Message *</label>
                        <textarea id="annMessage" required rows="4" class="form-input w-full" placeholder="Write full details of the announcement..."></textarea>
                    </div>

                    <label class="flex items-center gap-2.5 cursor-pointer p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-150 dark:border-gray-800">
                        <input type="checkbox" id="annPinned" class="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500">
                        <span class="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 font-bold"><i data-lucide="pin" class="w-3.5 h-3.5 text-amber-500"></i> Pin this announcement to top of feed</span>
                    </label>
                </div>
            </div>

            <!-- Bottom Action Nav Footer -->
            <div class="modal-bottom-nav flex-none p-3.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                <button type="button" onclick="renderAnnouncementsModule()" class="px-6 py-2 rounded-full font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all cursor-pointer">
                    ${window.t('btn_cancel', 'Cancel')}
                </button>
                <button type="submit" class="px-6 py-2 bg-[#2c3e50] hover:bg-[#1a252f] text-white rounded-full font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2">
                    <span>Publish Broadcast</span>
                </button>
            </div>
        </form>
    </div>`;

    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
        if (window.hydrateFormDraft) window.hydrateFormDraft('ownerAnnouncementDraft', area);
        if (window.attachFormDraftAutoSave) window.attachFormDraftAutoSave('ownerAnnouncementDraft', area);
    }, 50);
}

window.renderAnnouncementsModule = renderAnnouncementsModule;
window.renderAddAnnouncementView = renderAddAnnouncementView;
window.openAnnouncementModal = renderAddAnnouncementView;

window.submitAnnouncement = async function () {
    const title = document.getElementById('annTitle')?.value?.trim();
    const branchId = document.getElementById('annBranch')?.value || null;
    const priority = document.getElementById('annPriority')?.value || 'normal';
    const message = document.getElementById('annMessage')?.value?.trim();
    const isPinned = document.getElementById('annPinned')?.checked || false;

    if (!title || !message) {
        showToast('Title and message are required', 'error');
        return;
    }

    try {
        await dbAnnouncements.create({
            owner_id: state.ownerId,
            branch_id: branchId || null,
            title,
            message,
            priority,
            is_pinned: isPinned
        });

        if (window.clearFormDraft) window.clearFormDraft('ownerAnnouncementDraft');
        showToast('Announcement published successfully!', 'success');
        renderAnnouncementsModule();
    } catch (err) {
        showToast('Failed to publish announcement: ' + err.message, 'error');
    }
};

window.deleteAnnouncement = async function (id) {
    const ok = await confirmModal('Delete Announcement', 'Are you sure you want to delete this broadcast announcement?', 'Delete', 'Cancel');
    if (!ok) return;

    try {
        await dbAnnouncements.delete(id);
        showToast('Announcement removed', 'info');
        renderAnnouncementsModule();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

