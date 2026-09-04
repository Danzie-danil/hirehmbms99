
export async function loadNotifReads() {
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen && !loginScreen.classList.contains('hidden')) {
        state._readNotifKeys = new Set();
        return;
    }
    const readerId = state.role === 'owner' ? state.ownerId : state.branchId;
    if (!readerId) { state._readNotifKeys = new Set(); return; }

    try {
        const { data } = await supabaseClient
            .from('notification_reads')
            .select('notif_key')
            .eq('reader_id', readerId)
            .eq('reader_role', state.role);

        state._readNotifKeys = new Set((data || []).map(r => r.notif_key));
    } catch {
        state._readNotifKeys = new Set();
    }
}

export function isNotifRead(key) {
    return !!(state._readNotifKeys?.has(key));
}

export async function markNotifRead(key) {
    const readerId = state.role === 'owner' ? state.ownerId : state.branchId;
    if (!readerId || !key) return;

    state._readNotifKeys = state._readNotifKeys || new Set();
    state._readNotifKeys.add(key);

    const wrapper = document.querySelector(`.notif-wrapper[data-notif-key="${key}"]`);
    if (wrapper) {
        wrapper.classList.add('notif-read');
        const btn = wrapper.querySelector('.notif-read-btn');
        if (btn) btn.remove();
    }

    window.checkNotifications?.(true);

    try {
        await supabaseClient.from('notification_reads').upsert({
            reader_id: readerId,
            reader_role: state.role,
            notif_key: key
        }, { onConflict: 'reader_id,notif_key' });
    } catch (e) {

    }
}

export async function markAllNotifsRead() {
    const readerId = state.role === 'owner' ? state.ownerId : state.branchId;
    if (!readerId) return;

    const wrappers = document.querySelectorAll('.notif-wrapper[data-notif-key]');
    const keys = [...wrappers].map(w => w.getAttribute('data-notif-key')).filter(Boolean);
    if (!keys.length) return;

    state._readNotifKeys = state._readNotifKeys || new Set();
    keys.forEach(k => state._readNotifKeys.add(k));

    wrappers.forEach(w => {
        w.classList.add('notif-read');
        w.querySelector('.notif-read-btn')?.remove();
    });

    document.getElementById('notifBadge')?.classList.add('hidden');
    window.checkNotifications?.(true);

    try {
        await supabaseClient.from('notification_reads').upsert(
            keys.map(k => ({ reader_id: readerId, reader_role: state.role, notif_key: k })),
            { onConflict: 'reader_id,notif_key' }
        );
        showToast('All notifications marked as read', 'success', 2000);
    } catch (e) {

    }
}

export function buildNotifItem(key, innerHtml, isRead = false, urgency = 'normal') {
    const readClass = isRead ? 'notif-read' : '';
    const readBtnHtml = isRead ? '' : `
        <button
            class="notif-read-btn absolute right-0 top-0 h-full px-2 flex flex-col items-center justify-center bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest opacity-0 group-hover/notif:opacity-100 transition-all duration-200 transform translate-x-full group-hover/notif:translate-x-0 z-10 hover:bg-indigo-700 rounded-r-lg min-w-[44px] gap-0.5"
            onclick="event.stopPropagation(); window.markNotifRead('${key}')"
            title="Mark as read">
            <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
            <span>Read</span>
        </button>`;

    return `
    <div class="notif-wrapper group/notif relative overflow-hidden mb-1.5 rounded-lg ${readClass}"
         data-notif-key="${key}">
        ${readBtnHtml}
        <div class="notif-card notif-swipe-card w-full transition-transform duration-200 select-none">
            ${innerHtml}
        </div>
    </div>`;
}

export function addNotifInteractivity() {
    document.querySelectorAll('.notif-wrapper:not(.notif-read) .notif-swipe-card').forEach(card => {
        let startX = 0, currentX = 0, isDragging = false;
        const wrapper = card.closest('.notif-wrapper');
        const key = wrapper?.getAttribute('data-notif-key');
        if (!key) return;

        const THRESHOLD = 80;

        card.addEventListener('touchstart', e => {
            startX = e.touches[0].clientX;
            isDragging = true;
        }, { passive: true });

        card.addEventListener('touchmove', e => {
            if (!isDragging) return;
            currentX = e.touches[0].clientX - startX;
            if (currentX < 0) {
                card.style.transform = `translateX(${currentX}px)`;

                const btn = wrapper.querySelector('.notif-read-btn');
                if (btn) btn.style.opacity = Math.min(Math.abs(currentX) / THRESHOLD, 1);
            }
        }, { passive: true });

        card.addEventListener('touchend', () => {
            isDragging = false;
            if (currentX < -THRESHOLD) {

                card.style.transform = 'translateX(-110%)';
                setTimeout(() => window.markNotifRead(key), 200);
            } else {

                card.style.transform = '';
                const btn = wrapper.querySelector('.notif-read-btn');
                if (btn) btn.style.opacity = '';
            }
            currentX = 0;
        });
    });
}

window.markNotifRead = markNotifRead;
window.markAllNotifsRead = markAllNotifsRead;
window.isNotifRead = isNotifRead;
window.loadNotifReads = loadNotifReads;
window.addNotifInteractivity = addNotifInteractivity;
window.buildNotifItem = buildNotifItem;
