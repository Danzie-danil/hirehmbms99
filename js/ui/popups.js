import { dbPopups } from '../db.js';

export async function checkAndShowPopups() {
    try {
        const data = await dbPopups.fetchActive();

        if (!data || !data.length) return;

        const popup = data[0];
        const seenKey = `popup_seen_${popup.id}`;
        if (localStorage.getItem(seenKey)) return;

        renderPopupModal(popup);
    } catch (e) {
        console.warn('[Popups] Error checking popups:', e.message);
    }
}


function renderPopupModal(popup) {
    let existing = document.getElementById('clientSystemPopupModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'clientSystemPopupModal';
    modal.className = 'fixed inset-0 z-[35000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in select-none';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-indigo-100 dark:border-indigo-900/30 space-y-5">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                    <i data-lucide="bell" class="w-6 h-6 animate-bounce"></i>
                </div>
                <div>
                    <h3 class="text-lg font-black text-gray-900 dark:text-white">${escapeHtml(popup.title)}</h3>
                    <p class="text-xs text-gray-400">System Notification</p>
                </div>
            </div>

            <div class="text-sm font-semibold text-gray-700 dark:text-gray-300 leading-relaxed">
                ${escapeHtml(popup.message)}
            </div>

            <div class="flex items-center justify-end gap-3 pt-2">
                ${popup.action_text && popup.action_url ? `
                    <a href="${escapeHtml(popup.action_url)}" target="_blank" id="popupActionBtn" class="px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all">
                        ${escapeHtml(popup.action_text)}
                    </a>
                ` : ''}
                <button id="popupDismissBtn" class="px-5 py-2.5 rounded-2xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                    Dismiss
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();

    const markSeen = () => {
        localStorage.setItem(`popup_seen_${popup.id}`, 'true');
        modal.remove();
    };

    modal.querySelector('#popupDismissBtn')?.addEventListener('click', markSeen);
    modal.querySelector('#popupActionBtn')?.addEventListener('click', markSeen);
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

window.checkAndShowPopups = checkAndShowPopups;
