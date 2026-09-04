import { dbModalMessages } from '../db.js';

/**
 * Sysadmin Popup Modal Message Manager
 * Handles checking, presenting, and permanently safeguarding user seen states.
 */

let _isModalCurrentlyOpen = false;
const _sessionDismissedModalIds = new Set();

const TYPE_CONFIG = {
    announcement: {
        badge: 'Announcement',
        badgeClass: 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/60',
        icon: 'megaphone',
        iconBg: 'bg-indigo-600 text-white shadow-indigo-600/30',
        headerGrad: 'from-indigo-50/70 via-transparent to-transparent dark:from-indigo-950/30',
        ctaBtn: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25'
    },
    feature: {
        badge: 'New Feature',
        badgeClass: 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60',
        icon: 'sparkles',
        iconBg: 'bg-emerald-600 text-white shadow-emerald-600/30',
        headerGrad: 'from-emerald-50/70 via-transparent to-transparent dark:from-emerald-950/30',
        ctaBtn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
    },
    warning: {
        badge: 'Important Notice',
        badgeClass: 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60',
        icon: 'alert-triangle',
        iconBg: 'bg-amber-600 text-white shadow-amber-600/30',
        headerGrad: 'from-amber-50/70 via-transparent to-transparent dark:from-amber-950/30',
        ctaBtn: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
    },
    urgent: {
        badge: 'Urgent Alert',
        badgeClass: 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60',
        icon: 'shield-alert',
        iconBg: 'bg-rose-600 text-white shadow-rose-600/30',
        headerGrad: 'from-rose-50/70 via-transparent to-transparent dark:from-rose-950/30',
        ctaBtn: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
    },
    system_update: {
        badge: 'System Notice',
        badgeClass: 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60',
        icon: 'refresh-cw',
        iconBg: 'bg-purple-600 text-white shadow-purple-600/30',
        headerGrad: 'from-purple-50/70 via-transparent to-transparent dark:from-purple-950/30',
        ctaBtn: 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/25'
    },
    info: {
        badge: 'Information',
        badgeClass: 'bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/60',
        icon: 'info',
        iconBg: 'bg-sky-600 text-white shadow-sky-600/30',
        headerGrad: 'from-sky-50/70 via-transparent to-transparent dark:from-sky-950/30',
        ctaBtn: 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/25'
    }
};

/**
 * Formats basic Markdown text (bold, italic, links, lists) into safe, bold, clear HTML
 */
function _formatMarkdownToHtml(text) {
    if (!text) return '';
    let html = String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Bold **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-gray-950 dark:text-white">$1</strong>');
    // Italic *text*
    html = html.replace(/\*(.*?)\*/g, '<em class="italic font-semibold">$1</em>');
    // Links [title](url)
    html = html.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 underline font-bold hover:opacity-80">$1</a>');
    // Line breaks
    html = html.replace(/\n\n/g, '</p><p class="mt-3 leading-relaxed font-semibold text-gray-800 dark:text-gray-100">');
    html = html.replace(/\n/g, '<br/>');

    return `<p class="leading-relaxed font-semibold text-gray-800 dark:text-gray-100">${html}</p>`;
}

/**
 * Checks for unseen active modal messages and presents the first one
 */
export async function checkAndShowModalMessages() {
    if (_isModalCurrentlyOpen) return;

    // Do not pop up modal messages on auth or landing pages
    const path = window.location.pathname || '';
    const hash = window.location.hash || '';
    if (!path.includes('/app') && !hash.includes('#view=')) {
        return;
    }

    const userId = window.state?.user?.id || window.state?.userId;
    const role = window.state?.role || 'owner';

    // Do not pop up messages for sysadmins browsing their own portal
    if (role === 'sysadmin') return;

    try {
        const unseenMessages = await dbModalMessages.fetchActiveUnseen(userId, role);
        if (Array.isArray(unseenMessages) && unseenMessages.length > 0) {
            const modalToShow = unseenMessages.find(m => !_sessionDismissedModalIds.has(String(m.id)));
            if (modalToShow) {
                showModalMessagePopup(modalToShow);
            }
        }
    } catch (err) {
        console.debug('[ModalMessageManager] Check error:', err);
    }
}

/**
 * Renders and displays the Modal Message Popup
 */
export function showModalMessagePopup(modal) {
    if (!modal || !modal.id) return;
    if (_sessionDismissedModalIds.has(String(modal.id))) return;
    _isModalCurrentlyOpen = true;

    // Remove any previous existing overlay
    const existing = document.getElementById('adminModalMessageOverlay');
    if (existing) existing.remove();

    const typeKey = (modal.type || 'announcement').toLowerCase();
    const config = TYPE_CONFIG[typeKey] || TYPE_CONFIG.announcement;
    const formattedBody = _formatMarkdownToHtml(modal.body);

    const hasCtaUrl = Boolean(modal.cta_url && modal.cta_url.trim());
    const ctaText = modal.cta_text ? modal.cta_text.trim() : (hasCtaUrl ? 'Learn More' : 'Got It');

    const modalHtml = `
        <div id="adminModalMessageOverlay" onclick="if(event.target === this) window.dismissAdminModalMessage('${modal.id}', 'backdrop_click')" class="fixed inset-0 z-[99999] bg-white/70 dark:bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4 animate-in fade-in duration-200 cursor-pointer">
            <div class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 cursor-default" onclick="event.stopPropagation()">
                
                <!-- Header Banner with Icon, Title & Badge, and Close Button on the Right -->
                <div class="px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 bg-gradient-to-r ${config.headerGrad}">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-10 h-10 rounded-2xl ${config.iconBg} flex items-center justify-center shadow-lg shrink-0">
                            <i data-lucide="${config.icon}" class="w-5 h-5"></i>
                        </div>
                        <div class="min-w-0">
                            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${config.badgeClass}">
                                ${config.badge}
                            </span>
                            <h3 class="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight leading-snug mt-0.5 break-words">
                                ${modal.title || 'System Broadcast'}
                            </h3>
                        </div>
                    </div>
                    <button type="button" onclick="window.dismissAdminModalMessage('${modal.id}', 'closed')" 
                        title="Close"
                        class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>

                <!-- Body Content (Bold & Crystal Clear) -->
                <div class="p-5 sm:p-6 overflow-y-auto scroller-custom space-y-4 flex-1">
                    ${modal.banner_url ? `
                        <div class="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-xs max-h-48">
                            <img src="${modal.banner_url}" alt="${modal.title}" class="w-full h-full object-cover">
                        </div>
                    ` : ''}

                    <div class="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-100 leading-relaxed space-y-3">
                        ${formattedBody}
                    </div>
                </div>

                <!-- Footer Actions -->
                <div class="px-5 py-3.5 sm:px-6 bg-gray-50/80 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                    <button type="button" onclick="window.dismissAdminModalMessage('${modal.id}', 'dismissed')" 
                        class="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-700 rounded-xl transition-colors cursor-pointer">
                        Dismiss
                    </button>

                    <div class="flex items-center gap-2">
                        ${hasCtaUrl ? `
                            <button type="button" onclick="window.handleAdminModalCtaClick('${modal.id}', '${modal.cta_url}')"
                                class="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-black text-white ${config.ctaBtn || 'bg-indigo-600 hover:bg-indigo-700'} active:scale-95 rounded-xl shadow-md transition-all cursor-pointer">
                                <span>${ctaText}</span>
                                <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                            </button>
                        ` : `
                            <button type="button" onclick="window.dismissAdminModalMessage('${modal.id}', 'read')"
                                class="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-black text-white ${config.ctaBtn || 'bg-indigo-600 hover:bg-indigo-700'} active:scale-95 rounded-xl shadow-md transition-all cursor-pointer">
                                <i data-lucide="check" class="w-3.5 h-3.5"></i>
                                <span>${ctaText}</span>
                            </button>
                        `}
                    </div>
                </div>

            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    if (window.lucide) window.lucide.createIcons();

    // Attach Escape key dismiss listener
    const onEscapeKey = (e) => {
        if (e.key === 'Escape') {
            window.dismissAdminModalMessage(modal.id, 'escape_key');
            document.removeEventListener('keydown', onEscapeKey);
        }
    };
    document.addEventListener('keydown', onEscapeKey);
}

/**
 * Handles closing and permanently marking the modal message as seen
 */
export async function dismissAdminModalMessage(modalId, action = 'dismissed') {
    if (modalId) {
        _sessionDismissedModalIds.add(String(modalId));
    }
    const overlay = document.getElementById('adminModalMessageOverlay');
    if (overlay) {
        overlay.classList.add('opacity-0', 'transition-opacity', 'duration-200');
        setTimeout(() => {
            overlay.remove();
            _isModalCurrentlyOpen = false;
        }, 200);
    } else {
        _isModalCurrentlyOpen = false;
    }

    // Zero-repeat safeguard: record seen locally & in Supabase
    if (modalId && !String(modalId).startsWith('preview_temp_')) {
        await dbModalMessages.markSeen(modalId, action);
    }
}

/**
 * Handles CTA link click and marks seen as cta_clicked
 */
export async function handleAdminModalCtaClick(modalId, url) {
    await dismissAdminModalMessage(modalId, 'cta_clicked');
    if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}

// Global attachments
window.checkAndShowModalMessages = checkAndShowModalMessages;
window.showModalMessagePopup = showModalMessagePopup;
window.dismissAdminModalMessage = dismissAdminModalMessage;
window.handleAdminModalCtaClick = handleAdminModalCtaClick;
